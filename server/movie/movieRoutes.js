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
        const list = await Movie.findAndCountAll({
            where,
            order: [['createdAt', 'DESC']],
            offset: 0,
            limit: 1000
        });

        list.rows.forEach(movie => {
            movie.name = _.startCase(movie.name);
        });

        res.json(list);
    } catch (e) {
        console.error('LONG-JOHN ERROR:', e);
        res.status(500).json({ error: e });
    }
});

async function searchOmdb(q) {
    if (!config.omdbApiKey) {
        const err = new Error('OMDb API key not configured on server');
        err.status = 400;
        throw err;
    }
    const all = [];
    let message = null;
    for (let page = 1; page <= 3; page++) {
        const { data } = await axios.get('https://www.omdbapi.com/', {
            params: { s: q, apikey: config.omdbApiKey, page },
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

async function searchTmdb(q) {
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
        const pageResults = data.results
            .filter(r => (r.media_type === 'movie' || r.media_type === 'tv') && r.poster_path)
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
        if (!q) return res.json({ provider: providerLabel, results: [] });

        if (providers.length === 1) {
            const out = await providers[0].fn(q);
            return res.json(out);
        }

        const settled = await Promise.allSettled(providers.map(p => p.fn(q)));
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

router.get(route(':id'), async function (req, res) {
    const id = req.params.id;
    const file = await Movie.findByPk(id);
    streamers.videoStreamer(file.path, req, res);
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
        const movie = await Movie.findByPk(id, { paranoid: false });
        if (!movie) {
            return res.status(404).json({ error: 'Movie not found' });
        }

        if (movie.path) {
            try {
                await fs.promises.unlink(movie.path);
            } catch (e) {
                if (e.code !== 'ENOENT') console.error('LONG-JOHN unlink movie file:', e);
            }

            const dir = path.dirname(movie.path);
            const base = path.basename(movie.path, path.extname(movie.path));
            const vtt = path.join(dir, base + '.vtt');
            try {
                await fs.promises.unlink(vtt);
            } catch (e) {
                if (e.code !== 'ENOENT') console.error('LONG-JOHN unlink subtitle:', e);
            }
        }

        const coverPath = path.join(config.cover, id + '.jpg');
        try {
            await fs.promises.unlink(coverPath);
        } catch (e) {
            if (e.code !== 'ENOENT') console.error('LONG-JOHN unlink cover:', e);
        }

        await movie.destroy({ force: true });
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
