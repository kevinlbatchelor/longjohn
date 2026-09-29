const readDirectory = require('recursive-readdir');
const config = require('../util/config');
const movie = require('../movie/movie');
const audioBook = require('../audioBooks/audioBook');
const Promise = require('bluebird');
const imdb = require('imdb-api');
const scanner = {};
const os = require('os');
const dl = require('../util/downloadCoverArt.js');
const fs = require('fs');
const { showNameFor } = require('../tv/showCleanup');
const { cleanTitle } = require('../util/cleanTitle');
const osPathCharacter = os.platform() === 'win32' ? '\\' : '/';

/* A show's artwork, not an episode's ---------------------------------------------
 * A movie is one file, one row, one lookup, one cover filed under its row id.
 * None of that survives the trip to TV: OMDb has never heard of "Firefly S01E03",
 * a cover filed under an episode's row id is not what the TV grid asks for - it
 * asks by show name - and looking a title up once per episode is hundreds of
 * requests for one answer.
 *
 * So for TV the lookup happens once per show folder and is remembered for the
 * rest of the scan, and the cover it finds is saved as <show name>.jpg.
 */
const SHOW_LOOKUP_TIMEOUT_MS = 5000;

async function onDisk(target) {
    try {
        await fs.promises.access(target);
        return true;
    } catch (e) {
        return false;
    }
}

/* Resolves to the OMDb record for a show, or null. `found` is the per-scan memo,
   and a miss is remembered as null so a show OMDb does not know about is not
   asked about again on the next episode of it. */
async function showDataFor(showName, found) {
    if (found.has(showName)) return found.get(showName);

    const { title, year } = cleanTitle(showName);
    let data = null;

    if (title) {
        const query = { name: title };
        if (year) query.year = year;

        data = await imdb.get(query, {
            apiKey: config.omdbApiKey,
            timeout: SHOW_LOOKUP_TIMEOUT_MS
        }).catch((e) => {
            console.error('LONG-JOHN show lookup:', showName, e.message);
            return null;
        });
    }

    found.set(showName, data || null);

    /* Downloads on the first episode of a show and never again - including
       across scans, since the file is still there. Never overwrites: a cover
       picked by hand outranks whatever OMDb has. */
    if (data && data.poster && data.poster !== 'N/A') {
        const coverPath = config.cover + osPathCharacter + showName + '.jpg';
        if (!await onDisk(coverPath)) {
            await dl.downloadCoverArt(data.poster, config.cover, showName, false);
        }
    }

    return data || null;
}

scanner.scanForMovies = function (scanPaths, isTV = false) {
    function ignoreFunc(file, stats) {
        return stats.isDirectory();
    }

    // One memo for the whole run, so a show is looked up once however many of
    // its episodes turn up across the folders being scanned.
    const showsFound = new Map();

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
                        // The show's folder name under the TV folder, which is
                        // the only thing here OMDb stands a chance with.
                        const showName = isTV ? showNameFor(newMovie.path) : null;

                        const imdbData = showName
                            ? await showDataFor(showName, showsFound)
                            : await imdb.get({ name: newMovie.name }, {
                                apiKey: config.omdbApiKey,
                                timeout: 500
                            }).catch((e) => {
                                console.error('LONG-JOHN ERROR:', e);
                            });

                        if (imdbData) {
                            newMovie.imdb = imdbData;
                            /* Writing the genres straight over the column drops
                               the 'TV' marker the whole TV catalogue filters on,
                               and a show would vanish from the TV page the
                               moment its lookup succeeded. */
                            newMovie.genre = isTV ? `TV, ${imdbData.genres}` : imdbData.genres;
                            newMovie.rating = imdbData.rated;
                        }
                        const savedMovie = await movie.create(newMovie, { raw: true });

                        // A show's cover is already saved, under its own name.
                        if (!showName && savedMovie?.imdb?.poster) {
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
                    await audioBook.create(newAudio, { raw: true });
                    acc.push(newAudio.track);

                    if (!nameCache.includes(name)) {
                        const bookMeta = await dl.fetchBookMeta(name);

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