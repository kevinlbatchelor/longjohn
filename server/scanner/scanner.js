const readDirectory = require('recursive-readdir');
const config = require('../util/config');
const movie = require('../movie/movie');
const audioBook = require('../audioBooks/audioBook');
const Promise = require('bluebird');
const imdb = require('imdb-api');
const scanner = {};
const os = require('os');
const dl = require('../util/downloadCoverArt.js');
const audible = require('../audioBooks/audible');
const eBook = require('../eBooks/eBook');
const { readMobiMeta } = require('../eBooks/mobiMeta');
const fs = require('fs');
// Not `path`: the movie scanner below uses that name for a folder.
const nodePath = require('path');
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

/* Audiobooks ------------------------------------------------------------------
 * A book is a folder of mp3s named after it. Audible is asked once per book
 * for what it is, and the answer goes on every track row: the shelf list in
 * genre, the record in info, the way a movie carries its genre and imdb
 * blob. The cover is only fetched while there is no file for it, so a rescan
 * never writes over one picked by hand, and a shelf list already on the rows
 * - Audible's or typed in - is never written over either.
 */

/* A folder that is not there is a config problem, not a reason to abandon
   the whole scan: it is named in the log and the others are scanned. */
const present = (folder) => {
    if (fs.existsSync(folder)) return true;
    console.warn('LONG-JOHN scan: folder does not exist, skipping:', folder);
    return false;
};

const bookCoverExists = (name) => fs.existsSync(nodePath.join(config.cover, name + '-audio.jpg'));

const hasRecord = (info) => Boolean(info && info.asin);

scanner.scanForAudio = function (scanPaths) {
    // One lookup per book per scan, however many tracks it has.
    const seen = new Map();

    const lookup = async (name) => {
        if (seen.has(name)) return seen.get(name);

        let record = null;
        try {
            record = await audible.lookup(name);
            if (record && record.coverUrl && !bookCoverExists(name)) {
                await dl.downloadCoverArt(record.coverUrl, config.cover, name + '-audio', false);
            }
        } catch (e) {
            console.error('LONG-JOHN book lookup failed for', name, '-', e.message);
        }

        seen.set(name, record);
        return record;
    };

    /* Books scanned before Audible was the source, and books it had nothing
       on last time, get another go on every scan. */
    const backfill = async () => {
        const rows = await audioBook.findAll({ raw: true, attributes: ['name', 'genre', 'info'] });

        const known = new Set();
        const shelved = new Set();
        rows.forEach((row) => {
            if (hasRecord(row.info)) known.add(row.name);
            if (row.genre) shelved.add(row.name);
        });

        for (const name of new Set(rows.map((r) => r.name))) {
            if (known.has(name)) continue;

            const record = await lookup(name);
            if (!record) continue;

            const fields = { info: record };
            if (!shelved.has(name)) fields.genre = record.categories.join(', ');
            await audioBook.update(fields, { where: { name } });
            console.log('book matched:', name, '->', record.title);
        }
    };

    return Promise.map(scanPaths.filter(present), async (outerPath) => {
        return readDirectory(outerPath, ['!*.mp3']).then(async (paths) => {
            const nameIndex = outerPath.split(osPathCharacter).length;

            return Promise.reduce(paths, async (acc, stringPath) => {
                const pathParts = stringPath.split(osPathCharacter);
                const name = pathParts[nameIndex];

                const found = await audioBook.findOne({
                    where: { path: stringPath },
                    raw: true
                });
                if (found) return acc;

                const track = pathParts[pathParts.length - 1].slice(0, -4);
                const record = await lookup(name);

                await audioBook.create({
                    name,
                    track,
                    path: stringPath,
                    genre: record ? record.categories.join(', ') : null,
                    info: record || {}
                }, { raw: true });
                acc.push(track);
                return acc;
            }, []);
        });
    }).then(async (result) => {
        await backfill();
        return result;
    }).catch((e) => {
        console.error('LONG-JOHN ERROR:', e);
    });
};

/* eBooks ----------------------------------------------------------------------
 * One Kindle-format file is one book. The file's own header gives the title
 * and author, which makes a far better Audible search than the file name;
 * Audible then supplies the shelf list, series and cover, as for audiobooks.
 * A book Audible had nothing on is asked about again on every scan, and a
 * shelf list or cover already in place is never written over.
 */
const EBOOK_FILE = /\.(mobi|azw3?|prc)$/i;
const notAnEbook = (file, stats) => !stats.isDirectory() && !EBOOK_FILE.test(file);

scanner.scanForEbooks = function (scanPaths) {
    // What the file says, then Audible's record for it and a cover if there is none.
    const describe = async (filePath, name, file, id) => {
        const query = file && file.title ? [file.title, ...(file.authors || [])].join(' - ') : name;

        let record = null;
        try {
            record = await audible.lookup(query);
        } catch (e) {
            console.error('LONG-JOHN ebook lookup failed for', name, '-', e.message);
        }

        if (record && record.coverUrl && id && !dl.coverExists(id + '-ebook')) {
            await dl.downloadCoverArt(record.coverUrl, config.cover, id + '-ebook', false);
        }
        return record;
    };

    const backfill = async () => {
        const rows = await eBook.findAll({ raw: true, attributes: ['id', 'name', 'genre', 'info', 'path'] });
        for (const row of rows) {
            const info = row.info || {};
            if (info.asin) continue;

            const record = await describe(row.path, row.name, info.file, row.id);
            if (!record) continue;

            const fields = { info: { ...record, file: info.file || {} } };
            if (!row.genre) fields.genre = record.categories.join(', ');
            await eBook.update(fields, { where: { id: row.id } });
            console.log('ebook matched:', row.name, '->', record.title);
        }
    };

    return Promise.map(scanPaths.filter(present), async (outerPath) => {
        return readDirectory(outerPath, [notAnEbook]).then(async (paths) => {
            return Promise.reduce(paths, async (acc, filePath) => {
                const found = await eBook.findOne({ where: { path: filePath }, raw: true });
                if (found) return acc;

                let file = null;
                try {
                    file = await readMobiMeta(filePath);
                } catch (e) {
                    console.warn('LONG-JOHN could not read ebook header:', filePath, '-', e.message);
                }

                const format = nodePath.extname(filePath).slice(1).toLowerCase();
                const name = (file && file.title) || nodePath.basename(filePath, nodePath.extname(filePath));

                const row = await eBook.create({ name, path: filePath, format, genre: null, info: { file: file || {} } });
                const record = await describe(filePath, name, file, row.id);
                if (record) {
                    await row.update({ genre: record.categories.join(', '), info: { ...record, file: file || {} } });
                }

                acc.push(name);
                return acc;
            }, []);
        });
    }).then(async (result) => {
        await backfill();
        return result;
    }).catch((e) => {
        // Logged here, and thrown on so the route can say what went wrong
        // rather than answering with nothing.
        console.error('LONG-JOHN ebook scan ERROR:', e);
        throw e;
    });
};

module.exports = scanner;