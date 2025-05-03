const db = require('./db');
const Category = require('../../movie/movieCategory');
const Movie = require('../../movie/movie');
const Audiobook = require('../../audioBooks/audioBook');

const setup = function () {
    console.log('set up database')
    return db.connection.sync({force: true}).then(() => {
        return Category.updateFunction();
    }).catch((error) => {
        console.log(error, 'error');
    });
};

module.exports = setup;
