let db = require('./db');

let setup = function () {
    return db.connection.sync();
};

module.exports = setup;
