let db = require('./db');
const Category = require('../../movie/movieCategory');

let setup = function () {
    console.log('set up database')
    return db.connection.sync({force: true}).then(() => {
        return Category.updateFunction();
    }).catch((error) => {
        console.log(error, 'error');
    });
};

module.exports = setup;
