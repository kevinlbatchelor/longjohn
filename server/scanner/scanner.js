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
    const nameCache = [];

    return Promise.map(scanPaths, async (outerPath) => {
        return readDirectory(outerPath, ['!*.mp3']).then(async (paths) => {
            const nameIndex = outerPath.split(osPathCharacter).length;

            return Promise.reduce(paths, async (acc, stringPath) => {
                const pathParts = stringPath.split(osPathCharacter);
                const name = pathParts[nameIndex];
                const newAudio = {
                    name,            // book title
                    track: pathParts[pathParts.length - 1].slice(0, -4),
                    path: stringPath,
                    info: {}                            // stores isbn & coverUrl
                };

                const found = await audioBook.findOne({
                    where: { path: newAudio.path },
                    raw: true
                });

                if (!found) {
                    const saved = await audioBook.create(newAudio, { raw: true });
                    acc.push(newAudio.track);

                    if (!nameCache.includes(name)) {
                        const bookMeta = await dl.fetchBookMeta(_.startCase(name));
                        console.log('------->bookMeta', bookMeta);
                        if (bookMeta.coverUrl) {
                            await dl.downloadCoverArt(
                                bookMeta.coverUrl,
                                config.cover,
                                name+'-audio',
                                false
                            );
                        }
                        newAudio.info = bookMeta;            // persist meta if you want
                        nameCache.push(name);                // mark as done
                    } else {
                        console.log('skip already downloaded:', name);
                    }
                }
                return acc;
            }, []);
        });
    }).catch((e) => {
        console.error('LONG-JOHN ERROR:', e);
    });
};

module.exports = scanner;