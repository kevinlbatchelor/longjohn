const readDirectory = require('recursive-readdir');
const config = require('../util/config');
const movie = require('../movie/movie');
const audioBook = require('../audioBooks/audioBook');
const Promise = require('bluebird');
const imdb = require('imdb-api');
const _ = require('lodash');
const scanner = {};
const os = require('os');
const osPathCharacter = os.platform() === 'win32' ? '\\' : '/';

scanner.scanForMovies = function (scanPaths) {
    function ignoreFunc(file, stats) {
        return stats.isDirectory();
    }

    return Promise.map(scanPaths, function indexMovie(path) {
        return readDirectory(path, ['!*.mp4']).then((paths) => {
            return Promise.reduce(paths, (acc, path, index, length) => {
                let pathDetails = path.split(osPathCharacter);

                let newMovie = {};
                newMovie.name = pathDetails[pathDetails.length - 1].slice(0, -4);
                newMovie.ext = pathDetails[pathDetails.length - 1].split('.').pop();
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
                        newMovie.genre = foundMovie.genre;
                        newMovie.imdb = foundMovie.imdb;
                    }
                    return newMovie;
                }).then((newMovie) => {
                    let modMovie = newMovie;

                    if (_.isEmpty(newMovie.imdb)) {

                        return imdb.get({ name: newMovie.name }, {
                            apiKey: config.omdbApiKey,
                            timeout: 500
                        }).then((imdb) => {
                            newMovie.imdb = imdb;
                            newMovie.genre = imdb.genres;
                            newMovie.rating = imdb.rated;

                            modMovie = newMovie;
                            return newMovie;
                        }).catch((err) => {
                            console.log(newMovie.genre);
                            console.log(err);
                        }).then(() => {
                            return newMovie;
                        });
                    } else {
                        return Promise.resolve(newMovie);
                    }

                }).then((newMovie) => {
                    if (!newMovie.duplicate && newMovie.ext === 'mp4') {
                        delete newMovie.duplicate;
                        movie.create(newMovie);
                        return newMovie;
                    } else {
                        return movie.update({
                            genre: newMovie.genre,
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

    return Promise.map(scanPaths, (outerPath) => {
        return readDirectory(outerPath, ['!*.mp3']).then((paths) => {

            const nameIndex = outerPath.split(osPathCharacter).length;
            return Promise.reduce(paths, (acc, path, index, length) => {

                let pathDetails = path.split(osPathCharacter);

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
                        duplicateAudio = foundAudioBook;
                    } else {
                        audioBook.create(newAudio);
                        acc.push(newAudio.name);
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