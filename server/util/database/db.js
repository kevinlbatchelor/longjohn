const Promise = require('bluebird');
const db = require('sequelize');
const config = require('../../util/config');

const connection = new db(config.database.name, config.database.username, config.database.password, {
    host: config.database.host,
    port: config.database.port,
    dialect: 'postgres',
    logging: false,
    pool: {
        max: 5,
        min: 0,
        idle: 10000
    }
});

db.connection = connection;

let resolveFunction = null;
db.setupPromise = new Promise(function (resolve) {
    resolveFunction = resolve;
});
db.setupPromise.resolve = resolveFunction;

module.exports = db;
