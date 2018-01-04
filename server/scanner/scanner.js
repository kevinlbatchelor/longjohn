let readDirectory = require('recursive-readdir');
let config = require('../util/config');
let movie = require('../movie/movie');
let audioBook = require('../audioBooks/audioBook');
let Promise = require('bluebird');
const imdb = require('imdb-api');
const _ = require('lodash');

let scanner = {};

scanner.scanForMovies = function (scanPaths) {
    function ignoreFunc(file, stats) {
        return stats.isDirectory();
    }

    return Promise.map(scanPaths, (path) => {
        return readDirectory(path, [ignoreFunc]).then((paths) => {
            return Promise.reduce(paths, (acc, path, index, length) => {
                let pathDetails = path.split('\\');

                let newMovie = {};
                newMovie.name = pathDetails[pathDetails.length - 1].slice(0, -4);
                newMovie.path = path;
                newMovie.description = '';
                newMovie.genre = 'new';
                newMovie.duplicate = false;

                return movie.findOne({
                    where: {
                        path: newMovie.path
                    }
                }).then((foundMovie) => {
                    if (foundMovie) {
                        newMovie.name = foundMovie.dataValues.name;
                        newMovie.id = foundMovie.id;
                        newMovie.duplicate = true;
                    }
                    return newMovie;
                }).then((newMovie) => {
                    let modMovie = newMovie;

                    return imdb.get(newMovie.name, {
                        apiKey: config.omdbApiKey,
                        timeout: 500
                    }).then((imdb) => {
                        newMovie.imdb = imdb;
                        modMovie = newMovie;
                        return newMovie;
                    }).catch((err) => {
                        console.log(err, 'error');
                    }).then(() => {
                        return newMovie;
                    });
                }).then((newMovie) => {
                    if (!newMovie.duplicate) {
                        delete newMovie.duplicate;
                        movie.create(newMovie);
                        return newMovie;
                    } else {
                        return movie.update({
                            imdb: newMovie.imdb
                        }, {
                            where: {
                                id: newMovie.id
                            }
                        });
                    }
                }).then((movie) => {
                    acc.push(movie);

                    return acc;
                });
            }, []);
        });
    }).catch((error) => {
        console.log(error);
    });
};

scanner.scanForAudio = function (scanPaths) {
    function ignoreFunc(file, stats) {
        return stats.isDirectory();
    }

    return Promise.map(scanPaths, (path) => {
        return readDirectory(path, ['!*.mp3']).then((paths) => {
            const nameIndex = path.split('\\').length;
            return Promise.reduce(paths, (acc, path, index, length) => {
                let pathDetails = path.split('\\');

                let newAudio = {};
                newAudio.name = pathDetails[nameIndex];
                newAudio.track = pathDetails[pathDetails.length - 1].slice(0, -4);
                newAudio.path = path;
                let duplicateAudio;

                return audioBook.findOne({
                    where: {
                        path: newAudio.path
                    },
                    raw: true
                }).then((foundAudioBook) => {
                    if (foundAudioBook) {
                        duplicateAudio = foundAudioBook
                    } else {
                        audioBook.create(newAudio)
                        acc.push(newAudio.name);
                    }
                    return acc;
                })
            }, []);
        });
    }).catch((error) => {
        console.log(error);
    });
};

module.exports = scanner;