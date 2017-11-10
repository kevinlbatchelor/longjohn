let readDirectory = require('recursive-readdir');
let config = require('../util/config');
let movie = require('../movie/movie');
let Promise = require('bluebird');

let scanner = {};

scanner.scan = function () {
    function ignoreFunc(file, stats) {
        return stats.isDirectory();
    }

    return Promise.map(config.movies, (path) => {
        return readDirectory(path, [ignoreFunc]).then((paths) => {
            return Promise.reduce(paths, (acc, path, index, length) => {
                let pathDetails = path.split('\\');

                let newMovie = {};
                newMovie.name = pathDetails[pathDetails.length - 1].slice(0, -4);
                newMovie.path = path;
                newMovie.description = '';
                newMovie.genre = 'new';
                newMovie.duplicate = false;

                return movie.findAll({
                    where: {
                        path: newMovie.path
                    }
                }).then((foundMovie) => {
                    if (foundMovie.length > 0) {
                        newMovie.duplicate = true;
                    }
                    return newMovie;
                }).then((newMovie) => {
                    if (!newMovie.duplicate) {
                        delete newMovie.duplicate;
                        movie.create(newMovie);
                        acc.push(newMovie);
                    }
                    return acc;
                });
            }, []);
        });
    }).catch((error) => {
        console.log(error);
    });
};

module.exports = scanner;