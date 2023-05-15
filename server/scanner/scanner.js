const readDirectory = require('recursive-readdir');
const config = require('../util/config');
const movie = require('../movie/movie');
const audioBook = require('../audioBooks/audioBook');
const Promise = require('bluebird');
const imdb = require('imdb-api');
const _ = require('lodash');
const scanner = {};
const os = require('os');
const dl = require('../util/downloadCoverArt.js');
const osPathCharacter = os.platform() === 'win32' ? '\\' : '/';

scanner.scanForMovies = function (scanPaths, isTV = false) {
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
                if (isTV) {
                    newMovie.genre = 'TV';
                } else {
                    newMovie.genre = 'new';
                }

                newMovie.duplicate = false;

                return movie.findOne({
                    where: {
                        path: newMovie.path
                    }
                }).then((foundMovie) => {
                    if (foundMovie) {
                        console.log('------->already in db');
                        newMovie.name = foundMovie.dataValues.name;
                        newMovie.id = foundMovie.id;
                        newMovie.duplicate = true;
                        newMovie.genre = foundMovie.genre;
                        newMovie.imdb = foundMovie.imdb;
                    }
                    return newMovie;
                }).then((newMovie) => {
                    let modMovie = newMovie;
                    if (_.isEmpty(newMovie.imdb) && !isTV) {
                        console.log('------->looking up imdb');
                        return imdb.get({ name: newMovie.name }, {
                            apiKey: config.omdbApiKey,
                            timeout: 500
                        }).then((imdb) => {
                            newMovie.imdb = imdb;
                            newMovie.newImdb = true;
                            newMovie.genre = imdb.genres;
                            newMovie.rating = imdb.rated;

                            modMovie = newMovie;
                            return newMovie;
                        }).catch((err) => {
                            console.error('Error adding IMDB:', err);
                        }).then(() => {
                            return newMovie;
                        });
                    } else {
                        return Promise.resolve(newMovie);
                    }

                }).then((newMovie) => {
                    if (!newMovie.duplicate && newMovie.ext === 'mp4') {
                        delete newMovie.duplicate;
                        if (isTV) {
                            newMovie.genre = 'TV';
                        }
                        console.log('------->creating movie');
                        return movie.create(newMovie);
                    } else {
                        if (newMovie.newImdb) {
                            console.log('------->updating movie', newMovie.imdb);
                            return movie.update({
                                genre: newMovie.genre,
                                imdb: newMovie.imdb
                            }, {
                                where: {
                                    id: newMovie.id
                                }
                            }).then(() => {
                                return newMovie;
                            });
                        }
                    }
                }).then((newMovieWithImdb) => {
                    if (_.get(newMovieWithImdb, 'newImdb')) {
                        console.log('-----------new imdb');
                        return dl.downloadCoverArt(newMovieWithImdb.imdb.poster, config.cover, newMovieWithImdb.id).then(() => {
                            return newMovieWithImdb;
                        });
                    }
                    if (!_.get(newMovieWithImdb, 'duplicate')) {
                        return newMovieWithImdb;
                    }
                }).then((movie) => {
                    console.log('------->name', movie);
                    let name = _.get(movie, 'name');
                    if (name) {
                        acc.push(name);
                    }

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