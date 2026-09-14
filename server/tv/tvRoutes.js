const router = require('../util/router');
const Movie = require('../movie/movie.js');
const tvRoute = router.v1Path('tv');
const coverRoute = router.v1Path('cover');
const _ = require('lodash');
const streamers = require('../streaming/streamers');
const moviePath = require('../movie/moviePath');
const { removeMovie } = require('../movie/removeMovie');
const { showNameFor, showFolderFor, episodeRowsFor, cleanUpShowIfEmpty } = require('./showCleanup');
const { Op } = require('sequelize');
// tv shows share a data model with movies for now so use there sequelize data model in movie.js

/* The catalogue is derived from every TV row in the table, so the query and the
   grouping cost the same no matter who is asking. A stick walks grid -> show ->
   player -> back, which used to pay for that walk four times over, so the
   grouped result is held briefly and handed out from memory. Writes through this
   router drop it; the TTL covers a scanner run that does not. */
const CATALOG_TTL_MS = 30 * 1000;
let catalogCache = null; // { key, at, shows }

function invalidateCatalog() {
    catalogCache = null;
}

async function loadCatalog(category, name) {
    const key = `${category}|${name}`;

    if (catalogCache && catalogCache.key === key && Date.now() - catalogCache.at < CATALOG_TTL_MS) {
        return catalogCache.shows;
    }

    /* Only these three columns are read below. Naming them keeps the imdb JSONB
       blob - by far the widest column, and a per-row parse on the way out - off
       the wire entirely. */
    const rows = await Movie.findAll({
        raw: true,
        attributes: ['id', 'name', 'path'],
        where: {
            genre: {
                [Op.like]: `%${category}%`
            },
            name: {
                [Op.iLike]: `%${name}%`
            }
        },
        order: [['createdAt', 'DESC']]
    });

    // One pass, grouping as we go. A Map also keeps shows in the order the rows
    // arrived, which a plain object loses for numeric-looking show names.
    const byShow = new Map();

    for (const movie of rows) {
        const showName = showNameFor(movie.path);

        let show = byShow.get(showName);
        if (!show) {
            show = { episodes: [], name: showName };
            byShow.set(showName, show);
        }

        show.episodes.push({
            name: showName,
            episode: movie.name,
            id: movie.id
        });
    }

    const shows = Array.from(byShow.values());
    catalogCache = { key, at: Date.now(), shows, summary: null };
    return shows;
}

/* The grid draws a name and a cover per show, so that is all it is sent - not
   every episode of every show. Held on the cache entry because the grid is the
   page most often returned to. */
function summarise(shows) {
    // Identity, not truthiness: a write that lands between the load and here
    // drops the entry, and this summary belongs to the list already in hand.
    const cached = catalogCache && catalogCache.shows === shows;
    if (cached && catalogCache.summary) return catalogCache.summary;

    const summary = shows.map((show) => ({ name: show.name, count: show.episodes.length }));

    if (cached) catalogCache.summary = summary;

    return summary;
}

router.get(tvRoute(), async function (req, res) {
    try {
        const category = _.get(req, 'query.category', null);
        const name = _.get(req, 'query.name', null);
        const show = _.get(req, 'query.show', null);
        const summary = _.get(req, 'query.summary', null);

        const shows = await loadCatalog(category, name);

        if (summary) return res.json({ rows: summarise(shows) });

        // The episode list and the player only ever want one show. Filtering
        // here is the difference between a few KB and the whole catalogue.
        const rows = show ? shows.filter((s) => s.name === show) : shows;

        res.json({ rows });
    } catch (e) {
        console.error('LONG-JOHN ERROR:', e);
        res.status(500);
        res.json({ error: e });
    }
});

router.get(tvRoute(':id'), async function (req, res) {
    try {
        const filePath = await moviePath.pathFor(req.params.id);
        if (!filePath) return res.sendStatus(404);

        streamers.videoStreamer(filePath, req, res);
    } catch (e) {
        console.error('LONG-JOHN ERROR:', e);
        res.status(500);
        res.json({ error: e });
    }
});

router.get(coverRoute(':id'), function (req, res) {
    try {
        const fileName = req.params.id;
        streamers.imageStreamer(fileName, req, res);
    } catch (e) {
        console.error('LONG-JOHN ERROR:', e);
        res.status(500);
        res.json({ error: e });
    }
});

router.post(tvRoute(), async function (request, response) {
    try {
        const movie = await Movie.create(request.body, {});
        invalidateCatalog();
        response.json(movie);
    } catch (e) {
        console.error('LONG-JOHN ERROR:', e);
        response.status(500);
        response.json({ error: e });
    }
});

router.put(tvRoute(':id'), async function (req, res) {
    try {
        const id = req.params.id;

        const movie = await Movie.findOne({ where: { id: id } });
        const partData = req.body;
        movie.set(partData);
        const part = await movie.save();
        invalidateCatalog();
        moviePath.forget(id);
        res.json(part);
    } catch (e) {
        console.error('LONG-JOHN ERROR:', e);
        res.status(500);
        res.json({ error: e });
    }
});

/* Same job as DELETE /movie/:id - a bad episode is a bad file, and it has to
   leave the disk as well as the table or the scanner puts it straight back. */
router.delete(tvRoute(':id'), async function (req, res) {
    try {
        const id = req.params.id;

        // Read the path before the row goes - it is the only thing that says
        // which show this episode belonged to.
        const row = await Movie.findByPk(id, { raw: true, attributes: ['path'], paranoid: false });

        const removed = await removeMovie(id);
        if (!removed) {
            return res.status(404).json({ error: 'Episode not found' });
        }

        if (row && row.path) {
            await cleanUpShowIfEmpty(showNameFor(row.path), showFolderFor(row.path));
        }

        invalidateCatalog();
        res.json('Episode has been deleted.');
    } catch (e) {
        console.error('LONG-JOHN ERROR:', e);
        res.status(500);
        res.json({ error: e });
    }
});

/* Deleting a whole show is deleting each of its episodes - there is no show row
   to drop. Sequential on purpose: unlinking a few hundred files at once is not
   something the stick this runs off thanks you for. */
router.delete(tvRoute('show/:name'), async function (req, res) {
    try {
        const showName = req.params.name;
        const episodes = await episodeRowsFor(showName);

        if (!episodes.length) {
            return res.status(404).json({ error: 'Show not found' });
        }

        const showFolder = showFolderFor(episodes[0].path);

        for (const episode of episodes) {
            await removeMovie(episode.id);
        }

        await cleanUpShowIfEmpty(showName, showFolder);
        invalidateCatalog();
        res.json({ deleted: episodes.length });
    } catch (e) {
        console.error('LONG-JOHN ERROR:', e);
        res.status(500);
        res.json({ error: e });
    }
});

router.invalidateTvCatalog = invalidateCatalog;

module.exports = router;

// format for  ui
// [
//     {
//         "episodes": [
//             {
//                 "name": "Show 2",
//                 "episode": "star trek 2",
//                 "id": 57
//             },
//             {
//                 "name": "Show 2",
//                 "episode": "star trek1",
//                 "id": 58
//             }
//         ],
//         "name": "Show 2"
//     },
//     {
//         "episodes": [
//             {
//                 "name": "Show 1",
//                 "episode": "test 1",
//                 "id": 59
//             },
//             {
//                 "name": "Show 1",
//                 "epi    sode": "test 2",
//                 "id": 60
//             }
//         ],
//         "name": "Show 1"
//     }
// ]
