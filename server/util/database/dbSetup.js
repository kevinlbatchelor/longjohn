let db = require('./db');
const Category = require('../../movie/movieCategory');

let setup = function () {
    return db.connection.sync().then(() => {
        return Category.updateFunction();
    }).catch((error) => {
        console.log(error);
    });
};

module.exports = setup;
