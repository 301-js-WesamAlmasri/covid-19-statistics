CREATE TABLE IF NOT EXISTS country
(id SERIAL PRIMARY KEY,
country VARCHAR(255),
totalConfirmed INT,
totalDeaths INT,
totalRecovered INT,
date VARCHAR(255));