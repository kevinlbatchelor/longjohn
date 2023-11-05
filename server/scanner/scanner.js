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
            return Promise.reduce(paths, async (acc, path, index, length) => {
                try {
                    const pathDetails = path.split(osPathCharacter);
                    const newMovie = {};
                    newMovie.name = pathDetails[pathDetails.length - 1].slice(0, -4);
                    newMovie.ext = pathDetails[pathDetails.length - 1].split('.').pop();
                    newMovie.path = path;
                    newMovie.description = '';
                    newMovie.genre = isTV === true ? 'TV' : 'new';

                    const movieFromDB = await movie.findOne({
                        where: {
                            path: newMovie.path
                        }
                    });
                    if (!movieFromDB && newMovie.ext === 'mp4') {
                        const imdbData = await imdb.get({ name: newMovie.name }, {
                            apiKey: config.omdbApiKey,
                            timeout: 500
                        }).catch((e) => {
                            console.error('LONG-JOHN ERROR:', e);
                        });
                        if (imdbData) {
                            newMovie.imdb = imdbData;
                            newMovie.genre = imdbData.genres;
                            newMovie.rating = imdbData.rated;
                        }
                        const savedMovie = await movie.create(newMovie, { raw: true });
                        if (savedMovie?.imdb?.poster) {
                            await dl.downloadCoverArt(savedMovie.imdb.poster, config.cover, savedMovie.id);
                        }
                    }
                    acc.push(newMovie.name);

                    return acc;
                } catch (e) {
                    console.error('LONG-JOHN ERROR:', e);
                    acc.push(e);
                    return acc;
                }
            }, []);
        });
    }).catch((e) => {
        console.error('LONG-JOHN ERROR:', e);
    });
};

scanner.scanForAudio = function (scanPaths) {
    function ignoreFunc(file, stats) {
        return stats.isDirectory();
    }

    return Promise.map(scanPaths, (outerPath) => {
        return readDirectory(outerPath, ['!*.mp3']).then((paths) => {

            const nameIndex = outerPath.split(osPathCharacter).length;
            return Promise.reduce(paths, async (acc, path, index, length) => {

                let pathDetails = path.split(osPathCharacter);

                let newAudio = {};
                newAudio.name = pathDetails[nameIndex];
                newAudio.track = pathDetails[pathDetails.length - 1].slice(0, -4);
                newAudio.path = path;

                let foundAudioBook = await audioBook.findOne({
                    where: {
                        path: newAudio.path
                    },
                    raw: true
                });
                if (!foundAudioBook) {
                    await audioBook.create(newAudio);
                    acc.push(newAudio.name);
                }
                return acc;
            }, []);
        });
    }).catch((e) => {
        console.error('LONG-JOHN ERROR:', e);
    });
};

module.exports = scanner;