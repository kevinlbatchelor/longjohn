const axios = require('axios');
const fs = require('fs');
const os = require('os');
const path = require('path');
const config = require('./config');
const audible = require('../audioBooks/audible');
const osPathCharacter = os.platform() === 'win32' ? '\\' : '/';
const downloader = {};

downloader.downloadCoverArt = function (url, savePath, id, handleExt = true) {
    return axios({ url, responseType: 'stream' }).then((response) => {
            return new Promise((resolve, reject) => {
                const ext = url.substring(url.length - 4);
                let filePath = ''
                if(handleExt){
                    filePath = savePath + osPathCharacter + id + ext;
                } else {
                    filePath = savePath + osPathCharacter + id + '.jpg';
                }
                response.data.pipe(fs.createWriteStream(filePath)).on('finish', () => {
                    return resolve(filePath);
                }).on('error', (e) => {
                    console.error('------->e', e);
                    return reject(e);
                });
            });
        }
    ).catch((e) => {
        console.error('------->COVER ART ERROR:' + e);
    });
};

const unlinkQuietly = async (target) => {
    try {
        await fs.promises.unlink(target);
    } catch (e) {
        if (e.code !== 'ENOENT') console.error('LONG-JOHN unlink cover:', e.message);
    }
};

/* A cover chosen by hand, for any kind of thing keyed in the cover folder.
   Fetched to one side and moved into place rather than clearing the old one
   and hoping: a dead URL must not cost a book the cover it has. Windows
   refuses to rename over a file that is open for streaming, hence the second
   go with the old one out of the way. Resolves false when the fetch failed. */
downloader.replaceCover = async function (key, url) {
    const coverPath = path.join(config.cover, key + '.jpg');
    const incomingKey = key + '.incoming';
    const incomingPath = path.join(config.cover, incomingKey + '.jpg');

    const written = await downloader.downloadCoverArt(url, config.cover, incomingKey, false);
    if (!written) {
        await unlinkQuietly(incomingPath);
        return false;
    }

    try {
        await fs.promises.rename(incomingPath, coverPath);
    } catch (e) {
        await unlinkQuietly(coverPath);
        await fs.promises.rename(incomingPath, coverPath);
    }
    return true;
};

downloader.removeCover = (key) => unlinkQuietly(path.join(config.cover, key + '.jpg'));

downloader.coverExists = (key) => fs.existsSync(path.join(config.cover, key + '.jpg'));

/* Audiobook cover candidates for the picker --------------------------------------
 * Audible first, since that is the audiobook's own art. Google Books and Open
 * Library are the fallbacks for a book Audible does not carry - print covers,
 * but covers. Each answers in the shape the picker draws: id, title, year,
 * poster, source for the badge. A source that fails is named in `message`
 * and the rest still answer.
 */
const cleanGoogleImage = (url) => url.replace(/^http:/, 'https:').replace(/&edge=curl/, '').replace(/zoom=1/, 'zoom=2');

const googleCovers = async (q) => {
    const params = { q, maxResults: 20, printType: 'books' };
    if (config.goog) params.key = config.goog;

    const { data } = await axios.get('https://www.googleapis.com/books/v1/volumes', { params, timeout: 20000 });
    return (data.items || [])
        .filter((item) => item.volumeInfo && item.volumeInfo.imageLinks && item.volumeInfo.imageLinks.thumbnail)
        .map((item) => ({
            source: 'google',
            id: item.id,
            title: item.volumeInfo.title || '',
            year: String(item.volumeInfo.publishedDate || '').slice(0, 4),
            poster: cleanGoogleImage(item.volumeInfo.imageLinks.thumbnail),
            authors: item.volumeInfo.authors || []
        }));
};

// default=false makes a missing cover a 404 rather than a blank placeholder,
// so a pick with no image behind it fails loudly instead of saving one.
const openLibraryCovers = async (q) => {
    const { data } = await axios.get('https://openlibrary.org/search.json', {
        params: { q, limit: 20, fields: 'key,title,author_name,cover_i,first_publish_year' },
        timeout: 20000
    });
    return (data.docs || [])
        .filter((d) => d.cover_i)
        .map((d) => ({
            source: 'openlibrary',
            id: d.key,
            title: d.title || '',
            year: d.first_publish_year ? String(d.first_publish_year) : '',
            poster: `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg?default=false`,
            authors: d.author_name || []
        }));
};

const COVER_SOURCES = [
    { name: 'Audible', fn: audible.searchCovers },
    { name: 'Google Books', fn: googleCovers },
    { name: 'Open Library', fn: openLibraryCovers }
];

downloader.searchBookCovers = async function (q) {
    const settled = await Promise.allSettled(COVER_SOURCES.map((s) => s.fn(q)));

    const results = [];
    const messages = [];
    settled.forEach((outcome, i) => {
        if (outcome.status === 'fulfilled') results.push(...outcome.value);
        else messages.push(`${COVER_SOURCES[i].name}: ${(outcome.reason && outcome.reason.message) || 'failed'}`);
    });

    return {
        provider: 'books',
        results,
        ...(messages.length ? { message: messages.join(' • ') } : {})
    };
};

module.exports = downloader;
