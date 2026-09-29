const router = require('../util/router');
const Movie = require('./movie');
const route = router.v1Path('movie');
const coverRoute = router.v1Path('cover');
const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const config = require('../util/config');
const dl = require('../util/downloadCoverArt');
const streamers = require('../streaming/streamers');
const moviePath = require('./moviePath');
const { removeMovie } = require('./removeMovie');
const { showNameFor, showFolderFor, cleanUpShowIfEmpty } = require('../tv/showCleanup');
const { Op } = require('sequelize');

router.get(route(), async (req, res) => {
    const category = _.get(req, 'query.category');
    const name = _.get(req, 'query.name');
    const type = _.get(req, 'query.type');

    const where = {};

    if (category && category !== 'All') {
        where.genre = { [Op.like]: `%${category}%` };
    }

    if (name) {
        where.name = { [Op.iLike]: `%${name}%` };
    }

    if (type === 'Movie') {
        where.genre = {
            ...(where.genre || {}),
            [Op.notILike]: '%TV%'
        };
    }

    try {
        /* The grid renders a title and a cover and filters on the rating, and
           that is the whole of what the client reads off a row. Naming those
           three columns leaves the imdb JSONB blob behind, which was 84% of a
           1.6 MB response - on the route the app opens on. raw skips building a
           thousand model instances only to serialise them straight back out. */
        const rows = await Movie.findAll({
            raw: true,
            attributes: ['id', 'name', 'rating'],
            where,
            order: [['createdAt', 'DESC']],
            offset: 0,
            limit: 1000
        });

        rows.forEach(movie => {
            movie.name = _.startCase(movie.name);
        });

        // count came from findAndCountAll, which spent a second query on a
        // number nothing reads. Kept in the shape so the response is unchanged.
        res.json({ count: rows.length, rows });
    } catch (e) {
        console.error('LONG-JOHN ERROR:', e);
        res.status(500).json({ error: e });
    }
});

async function searchOmdb(q, kind) {
    if (!config.omdbApiKey) {
        const err = new Error('OMDb API key not configured on server');
        err.status = 400;
        throw err;
    }
    const all = [];
    let message = null;
    for (let page = 1; page <= 3; page++) {
        const { data } = await axios.get('https://www.omdbapi.com/', {
            /* OMDb takes the filter itself, which matters more here than it
               looks: a show's name is very often also a film's, and searching
               "Fargo" unfiltered buries the series under the movie. */
            params: {
                s: q,
                apikey: config.omdbApiKey,
                page,
                ...(kind === 'series' ? { type: 'series' } : {})
            },
            timeout: 5000,
            validateStatus: () => true
        });
        if (!data || data.Response === 'False') {
            if (page === 1) message = (data && data.Error) || 'No results';
            break;
        }
        const pageResults = (data.Search || [])
            .filter(r => r.Poster && r.Poster !== 'N/A')
            .map(r => ({
                source: 'omdb',
                id: r.imdbID,
                title: r.Title,
                year: r.Year,
                type: r.Type,
                poster: r.Poster
            }));
        all.push(...pageResults);
        if (pageResults.length < 10) break;
    }
    return { provider: 'omdb', results: all, ...(message ? { message } : {}) };
}

async function searchTmdb(q, kind) {
    if (!config.tmdbApiKey) {
        const err = new Error('TMDb API key not configured on server');
        err.status = 400;
        throw err;
    }
    const all = [];
    for (let page = 1; page <= 3; page++) {
        const { data } = await axios.get('https://api.themoviedb.org/3/search/multi', {
            params: { api_key: config.tmdbApiKey, query: q, page, include_adult: false },
            timeout: 5000,
            validateStatus: () => true
        });
        if (!data || !Array.isArray(data.results)) break;
        const wanted = kind === 'series' ? ['tv'] : ['movie', 'tv'];
        const pageResults = data.results
            .filter(r => wanted.includes(r.media_type) && r.poster_path)
            .map(r => {
                const isMovie = r.media_type === 'movie';
                const date = isMovie ? r.release_date : r.first_air_date;
                return {
                    source: 'tmdb',
                    id: String(r.id),
                    title: isMovie ? r.title : r.name,
                    year: date ? date.slice(0, 4) : '',
                    type: r.media_type,
                    poster: 'https://image.tmdb.org/t/p/w500' + r.poster_path
                };
            });
        all.push(...pageResults);
        if (data.page >= data.total_pages) break;
    }
    return { provider: 'tmdb', results: all };
}

function activeProviders() {
    const list = [];
    if (config.tmdbApiKey) list.push({ name: 'tmdb', fn: searchTmdb });
    if (config.omdbApiKey) list.push({ name: 'omdb', fn: searchOmdb });
    return list;
}

router.get(route('cover-search'), async function (req, res) {
    try {
        const providers = activeProviders();
        if (!providers.length) {
            return res.status(400).json({
                error: 'No cover provider configured – set tmdbApiKey and/or omdbApiKey in server/util/config.js'
            });
        }

        const providerLabel = providers.length > 1 ? 'both' : providers[0].name;
        const q = (req.query.q || '').trim();
        /* Anything but the one value we know how to narrow on is ignored, so a
           stray ?type= cannot quietly empty the results. */
        const kind = req.query.type === 'series' ? 'series' : null;
        if (!q) return res.json({ provider: providerLabel, results: [] });

        if (providers.length === 1) {
            const out = await providers[0].fn(q, kind);
            return res.json(out);
        }

        const settled = await Promise.allSettled(providers.map(p => p.fn(q, kind)));
        const results = [];
        const messages = [];
        settled.forEach((s, i) => {
            const name = providers[i].name;
            if (s.status === 'fulfilled') {
                results.push(...s.value.results);
                if (s.value.message) messages.push(`${name}: ${s.value.message}`);
            } else {
                messages.push(`${name}: ${(s.reason && s.reason.message) || 'failed'}`);
            }
        });

        res.json({
            provider: 'both',
            results,
            ...(messages.length ? { message: messages.join(' • ') } : {})
        });
    } catch (e) {
        const status = e.status || 500;
        if (status >= 500) console.error('LONG-JOHN cover-search ERROR:', e.message);
        res.status(status).json({ error: e.message });
    }
});

/* The one place the imdb blob is read back out. It is deliberately kept off
   both list routes - it was 84% of the catalogue response - so the player asks
   for it per movie, which is the only granularity anything ever wanted.

   Two segments, so the streaming route below cannot shadow it. */
router.get(route(':id/info'), async function (req, res) {
    try {
        const row = await Movie.findByPk(req.params.id, {
            raw: true,
            attributes: ['id', 'name', 'rating', 'genre', 'imdb']
        });

        if (!row) return res.status(404).json({ error: 'Movie not found' });

        /* null rather than a 404: a row scanned before the OMDb key was set,
           or one the lookup timed out on, simply has nothing to show. That is
           an ordinary state, and the player draws no panel for it. */
        res.json({
            id: row.id,
            name: row.name,
            rating: row.rating,
            genre: row.genre,
            imdb: row.imdb || null
        });
    } catch (e) {
        console.error('LONG-JOHN ERROR:', e);
        res.status(500).json({ error: e });
    }
});

/* The whole file as an attachment, named as it is on disk. The streaming route
   below answers nothing but range requests (a plain GET gets a 416), so the
   browser's own download of the stream URL never worked; this one goes
   through res.download, which sets Content-Disposition and still honours
   ranges for a download manager that resumes. Two segments, like info, so it
   is not shadowed by the stream. */
router.get(route(':id/download'), async function (req, res) {
    const filePath = await moviePath.pathFor(req.params.id);
    if (!filePath) return res.sendStatus(404);

    res.download(filePath, path.basename(filePath), function (err) {
        if (!err || res.headersSent) return;
        res.sendStatus(err.code === 'ENOENT' ? 404 : 500);
    });
});

router.get(route(':id'), async function (req, res) {
    // Every range request lands here, so the path comes from the memo rather
    // than a fresh row read per chunk.
    const filePath = await moviePath.pathFor(req.params.id);
    if (!filePath) return res.sendStatus(404);

    streamers.videoStreamer(filePath, req, res);
});

router.get(coverRoute(':id'), function (req, res) {
    const fileName = req.params.id;
    streamers.imageStreamer(fileName, req, res);
});

router.post(route(), async function (request, response) {
    try {
        const movie = await Movie.create(request.body, {});
        response.json(movie);
    } catch (e) {
        console.error('LONG-JOHN ERROR:', e);
        response.status(500);
        response.json({ error: e });
    }
});

router.put(route(':id'), async function (req, res) {
    try {
        const id = req.params.id;
        const movie = await Movie.findOne({ where: { id: id } });
        const partData = req.body;
        movie.set(partData);
        const part = await movie.save();
        moviePath.forget(id);
        res.json(part);
    } catch (e) {
        console.error('LONG-JOHN ERROR:', e);
        res.status(500);
        res.json({ error: e });
    }
});

router.delete(route(':id'), async function (req, res) {
    try {
        const id = req.params.id;

        // Read the path first: if this row turns out to be the last episode of
        // a TV show, it is the only thing left saying which show that was.
        const row = await Movie.findByPk(id, { raw: true, attributes: ['path'], paranoid: false });

        const removed = await removeMovie(id);
        if (!removed) {
            return res.status(404).json({ error: 'Movie not found' });
        }

        if (row && row.path) {
            await cleanUpShowIfEmpty(showNameFor(row.path), showFolderFor(row.path));
        }

        /* A TV episode is a movie row too, so a delete from either list can
           leave the grouped TV catalogue holding a row that is gone. Required
           here rather than at the top of the file: every route module shares one
           express Router, so requiring tvRoutes at load time would register its
           routes ahead of these ones. */
        require('../tv/tvRoutes').invalidateTvCatalog();
        res.json('Movie has been deleted.');
    } catch (e) {
        console.error('LONG-JOHN ERROR:', e);
        res.status(500);
        res.json({ error: e });
    }
});

router.post(route(':id/cover'), async function (req, res) {
    try {
        const id = req.params.id;
        const url = req.body && req.body.url;
        if (!url) return res.status(400).json({ error: 'Missing url' });

        const movie = await Movie.findByPk(id);
        if (!movie) return res.status(404).json({ error: 'Movie not found' });

        const coverPath = path.join(config.cover, id + '.jpg');
        try { await fs.promises.unlink(coverPath); } catch (e) {
            if (e.code !== 'ENOENT') console.error('LONG-JOHN unlink old cover:', e);
        }

        await dl.downloadCoverArt(url, config.cover, id, false);
        res.json({ ok: true });
    } catch (e) {
        console.error('LONG-JOHN set-cover ERROR:', e);
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
