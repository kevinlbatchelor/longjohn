const imdb = require('imdb-api');
const fs = require('fs');
const path = require('path');
const Movie = require('./movie');
const config = require('../util/config');
const dl = require('../util/downloadCoverArt');
const { showNameFor } = require('../tv/showCleanup');

/* Backfilling OMDb data ---------------------------------------------------------
 * The scanner only looks a title up while it is creating a row, so everything
 * already in the table was written before the lookup existed - or before the API
 * key was set - and would stay empty forever. This is the pass that fills them
 * in afterwards.
 *
 * Three things it does that the scanner does not:
 *
 *  - It cleans the title first. A row's name is the filename minus its
 *    extension, so "Blade.Runner.1982.1080p.BluRay.x264" is what OMDb was being
 *    asked about, and OMDb has never heard of it.
 *
 *  - It looks TV up by show, not by episode. "S01E01" matches nothing, so every
 *    episode of a show shares one lookup on the show's folder name - which is
 *    also one request instead of several hundred.
 *
 *  - It gives the lookup room to answer. The scanner allows it 500ms, which on a
 *    Pi over a home connection is most of why rows come back empty even with a
 *    key configured.
 */

const LOOKUP_TIMEOUT_MS = 5000;

// Deliberately small. OMDb's free tier is 1000 requests a day, and a library
// scanned in one go could spend the lot on a single click.
const DEFAULT_LIMIT = 25;

const NOISE = /\b(1080p|720p|480p|2160p|4k|uhd|bluray|blu-ray|brrip|bdrip|dvdrip|webrip|web-dl|webdl|hdtv|hdrip|x264|x265|h264|h265|hevc|xvid|aac|ac3|dts|remux|proper|repack|extended|unrated|limited|internal)\b/gi;
const YEAR = /\b(19\d{2}|20\d{2})\b/;

function clean(value) {
    if (value === null || value === undefined) return null;
    const text = String(value).trim();
    return (!text || text === 'N/A') ? null : text;
}

/* Everything from the year rightwards in a scene filename is release detail, not
   title, so the year doubles as the place to cut. */
function cleanTitle(raw) {
    if (!raw) return { title: null, year: null };

    let text = String(raw).replace(/[._]+/g, ' ');

    const matched = YEAR.exec(text);
    const year = matched ? Number(matched[1]) : null;
    if (matched) text = text.slice(0, matched.index);

    text = text
        .replace(NOISE, ' ')
        .replace(/[[\](){}]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    return { title: text || null, year };
}

/* One job per lookup: a movie is its own job, a show is one job covering all of
   its episodes. */
async function planWork(force) {
    const rows = await Movie.findAll({
        raw: true,
        attributes: ['id', 'name', 'path', 'genre'],
        where: force ? {} : { imdb: null }
    });

    const jobs = new Map();

    for (const row of rows) {
        const show = row.path ? showNameFor(row.path) : null;
        const key = show ? `show:${show}` : `movie:${row.id}`;

        let job = jobs.get(key);
        if (!job) {
            const source = show || row.name;
            const { title, year } = cleanTitle(source);
            job = { key, show, title, year, source, rows: [] };
            jobs.set(key, job);
        }

        job.rows.push(row);
    }

    return Array.from(jobs.values());
}

async function lookUp(job) {
    const query = { name: job.title };
    if (job.year) query.year = job.year;

    return imdb.get(query, { apiKey: config.omdbApiKey, timeout: LOOKUP_TIMEOUT_MS });
}

async function alreadyOnDisk(coverPath) {
    try {
        await fs.promises.access(coverPath);
        return true;
    } catch (e) {
        return false;
    }
}

/* Movie covers are keyed by row id, show covers by show name - that is what the
   two grids ask the cover route for. Never overwrites: a cover picked by hand in
   Admin outranks whatever OMDb has. */
async function saveCover(job, data) {
    const poster = clean(data.poster);
    if (!poster) return false;

    const key = job.show ? job.show : String(job.rows[0].id);
    const coverPath = path.join(config.cover, key + '.jpg');

    if (await alreadyOnDisk(coverPath)) return false;

    await dl.downloadCoverArt(poster, config.cover, key, false);
    return true;
}

/* The scanner writes imdb.genres straight over the genre column, which for an
   episode drops the 'TV' the whole TV catalogue filters on - the show would
   vanish from the TV page. Keep the marker and add the genres to it. */
function genreFor(row, data) {
    const genres = clean(data.genres);
    if (!genres) return row.genre;

    return /TV/i.test(row.genre || '') ? `TV, ${genres}` : genres;
}

async function backfill({ limit = DEFAULT_LIMIT, force = false } = {}) {
    if (!config.omdbApiKey) {
        const err = new Error('OMDb API key not configured on server - set omdbApiKey in server/util/config.js');
        err.status = 400;
        throw err;
    }

    const jobs = await planWork(force);
    const pending = jobs.length;
    const runnable = jobs.filter((job) => job.title);

    const matched = [];
    const missed = [];
    let rowsUpdated = 0;
    let coversSaved = 0;

    // Sequential on purpose: this is a Pi talking to a rate-limited free API.
    for (const job of runnable.slice(0, limit)) {
        let data = null;

        try {
            data = await lookUp(job);
        } catch (e) {
            missed.push({ title: job.title, from: job.source, reason: e.message });
            continue;
        }

        if (!data) {
            missed.push({ title: job.title, from: job.source, reason: 'no match' });
            continue;
        }

        for (const row of job.rows) {
            await Movie.update(
                { imdb: data, genre: genreFor(row, data), rating: clean(data.rated) || row.rating },
                { where: { id: row.id } }
            );
            rowsUpdated++;
        }

        if (await saveCover(job, data)) coversSaved++;

        matched.push({
            title: job.title,
            matchedAs: clean(data.title),
            year: data.year,
            episodes: job.rows.length
        });
    }

    return {
        pending,
        // A row whose name cleaned down to nothing has no question to ask.
        unusable: jobs.length - runnable.length,
        looked_up: Math.min(runnable.length, limit),
        remaining: Math.max(0, runnable.length - limit),
        rowsUpdated,
        coversSaved,
        matched,
        missed
    };
}

module.exports = { backfill, cleanTitle };
