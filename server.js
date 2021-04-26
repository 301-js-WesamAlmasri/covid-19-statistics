require('dotenv').config();
const express = require('express');
const cors = require('cors');
const superagent = require('superagent');
const pg = require('pg');
const methodOverride = require('method-override');

const app = express(cors());
app.use(methodOverride('_method'));
app.use(express.urlencoded({ extended: true }));
app.use(express.static('/.public'));
app.set('view engine', 'ejs');

const client = new pg.Client(process.env.DATABASE_URL);

const PORT = process.env.PORT || 3000;

// handlers
app.get('/', function (req, res, next) {
  superagent.get('https://api.covid19api.com/world/total').then((data) => {
    const totalWordStatistics = new WorldTotalStatistics(data.body);
    res.render('pages/index', { totalWordStatistics: totalWordStatistics });
  });
});

app.post('/get-country-result', function (req, res, next) {
  const { counrty, from, to } = req.body;
  const url = `https://api.covid19api.com/country/${counrty}/status/confirmed?from=${from}&to=${to}`;
  superagent.get(url).then((data) => {
    const countryConfermedCases = data.body.map(
      (item) => new CountryConfirmedCases(item)
    );
    res.render('pages/getCountryResult.ejs', {
      countryConfermedCases: countryConfermedCases,
    });
  });
});

app.get('/all-countries', function (req, res, next) {
  superagent.get('https://api.covid19api.com/summary').then((data) => {
    const allCountriesStatistics = data.body.Countries.map(
      (item) => new CountryCases(item)
    );
    res.render('pages/allCountries', {
      allCountriesStatistics: allCountriesStatistics,
    });
  });
});

app.post('/save-card', function (req, res, next) {
  const {
    country,
    totalConfirmed,
    totalDeaths,
    totalRecovered,
    date,
  } = req.body;
  let sqlQuery =
    'INSERT INTO country (country, totalConfirmed, totalDeaths, totalRecovered, date) VALUES ($1, $2, $3, $4, $5)';
  let safeValues = [
    country,
    parseInt(totalConfirmed),
    parseInt(totalDeaths),
    parseInt(totalRecovered),
    date,
  ];
  client
    .query(sqlQuery, safeValues)
    .then(res.redirect('/my-records'))
    .catch((e) => console.log(e));
});

app.get('/my-records', function (req, res, next) {
  let sqlQuery = 'SELECT id, country, date FROM country;';
  client.query(sqlQuery).then((data) => {
    const allCountriesStatistics = data.rows;
    res.render('pages/myRecords', {
      allCountriesStatistics: allCountriesStatistics,
    });
  });
});

app.get('/record-details/:id', function (req, res, next) {
  let id = req.params.id;
  let sqlQuery = 'SELECT * FROM country WHERE id=$1;';
  client.query(sqlQuery, [id]).then((data) => {
    const countryDetails = data.rows[0];
    res.render('pages/recordDetails', {
      countryDetails: countryDetails,
    });
  });
});

app.delete('/delete-record/:id', function (req, res, next) {
  let id = req.params.id;
  let sqlQuery = 'DELETE FROM country WHERE id=$1;';
  client
    .query(sqlQuery, [id])
    .then(res.redirect('/my-records'))
    .catch((e) => console.log(e));
});

app.put('/update-record/:id', function (req, res, next) {
  let id = req.params.id;
  let { country, totalConfirmed, totalDeaths, totalRecovered, date } = req.body;
  let sqlQuery =
    'UPDATE country SET country=$1, totalConfirmed=$2, totalDeaths=$3, totalRecovered=$4, date=$5  WHERE id=$6;';
  let safeValues = [
    country,
    parseInt(totalConfirmed),
    parseInt(totalDeaths),
    parseInt(totalRecovered),
    date,
    parseInt(id),
  ];
  client
    .query(sqlQuery, safeValues)
    .then(res.redirect(`/record-details/${id}`))
    .catch((e) => console.log(e.stack));
});

// Construcotrs

function WorldTotalStatistics(data) {
  this.totalConfirmed = data.TotalConfirmed;
  this.totalDeaths = data.TotalDeaths;
  this.totalRecovered = data.TotalRecovered;
}

function CountryConfirmedCases(data) {
  this.country = data.Country;
  this.date = data.Date;
  this.cases = data.Cases;
}

function CountryCases(data) {
  this.country = data.Country;
  this.totalConfirmed = data.TotalConfirmed;
  this.totalDeaths = data.TotalDeaths;
  this.totalRecovered = data.TotalRecovered;
  this.date = data.Date;
}

// start the server
client
  .connect()
  .then(() => {
    app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
  })
  .catch((e) => console.log(e));
