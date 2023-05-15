const dl = require('./server/util/downloadCoverArt.js');
const config = require('./server/util/config');

let Movie = require('./server/movie/movie');
let _ = require('lodash');
const Promise = require('bluebird');

Movie.findAndCountAll({}).then(function (list) {

    return list.rows;

}).then((movies) => {
    return Promise.each(movies, (movie, index, length) => {
        if (movie.imdb) {
            return dl.downloadCoverArt(movie.imdb.poster, config.cover, movie.id).then((filePath) => {
                movie.cover = filePath;
                return movie.update({ cover: filePath });
            }).catch((e) => {
                console.log('skipping error');
            });
        }
    });
}).catch(function (err) {
    console.error(err);
});