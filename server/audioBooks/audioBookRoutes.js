const router = require('../util/router');
const AudioBook = require('./audioBook');
const route = router.v1Path('audioBooks');
const streamers = require('../streaming/streamers');
const path = require('path');
const dl = require('../util/downloadCoverArt');

// The shelf list on a row, comma separated like a movie's genre.
const splitGenre = (genre) => String(genre || '').split(',').map((s) => s.trim()).filter(Boolean);
const tidyCategories = (list) => Array.from(new Set(list.map((c) => String(c).trim().slice(0, 60)).filter(Boolean)));
/* One entry per book. The rows are tracks, so they are folded here: what
   the book is off whichever row carries Audible's record, the shelf list off
   the genre column, the newest track's date as when the book arrived, and a
   track count. The description stays behind - it is most of the record and
   the grid has nowhere to put it. */
router.get(route(), async function (req, res) {
    try {
        const rows = await AudioBook.findAll({
            raw: true,
            attributes: ['name', 'genre', 'info', 'createdAt'],
            order: [['name'], ['createdAt']]
        });

        const books = new Map();
        rows.forEach((row) => {
            let book = books.get(row.name);
            if (!book) {
                book = {
                    name: row.name,
                    authors: [],
                    narrators: [],
                    series: null,
                    categories: [],
                    runtimeMinutes: null,
                    tracks: 0,
                    added: row.createdAt
                };
                books.set(row.name, book);
            }

            book.tracks += 1;
            if (row.createdAt > book.added) book.added = row.createdAt;
            if (!book.categories.length) book.categories = splitGenre(row.genre);

            const info = row.info || {};
            if (!book.authors.length && Array.isArray(info.authors)) {
                book.authors = info.authors;
                book.narrators = info.narrators || [];
                book.series = info.series || null;
                book.runtimeMinutes = info.runtimeMinutes || null;
            }
        });

        res.json(Array.from(books.values()));
    } catch (e) {
        console.error('LONG-JOHN ERROR:', e);
        res.status(500);
        res.json({ error: e });
    }
});

router.get(route('playlist'), async function (req, res) {
    try {
        const book = req.query.book;
        const list = await AudioBook.findAll({
            where: {
                name: book
            },
            order: ['track']
        });
        res.json(list);
    } catch (e) {
        console.error('LONG-JOHN ERROR:', e);
        res.status(500);
        res.json({ error: e });
    }
});

// Ahead of the :id stream route, which would otherwise swallow it.
router.get(route('cover-search'), async function (req, res) {
    try {
        const q = (req.query.q || '').trim();
        if (!q) return res.json({ provider: 'books', results: [] });

        // { provider, results, message? } - a source that failed is named in
        // message, and the rest still answer.
        res.json(await dl.searchBookCovers(q));
    } catch (e) {
        console.error('LONG-JOHN book cover-search ERROR:', e.message);
        res.status(502).json({ error: 'Cover lookup failed: ' + e.message });
    }
});

/* Picking a book's cover by hand. Same shape as the show version: the client
   sends a cover URL it picked out of cover-search and the server fetches it,
   to one side first, so a dead link cannot cost the book the cover it has. */
router.post(route(':name/cover'), async function (req, res) {
    try {
        const { name } = req.params;
        const url = req.body && req.body.url;
        if (!url) return res.status(400).json({ error: 'Missing url' });

        const exists = await AudioBook.findOne({ raw: true, attributes: ['id'], where: { name } });
        if (!exists) return res.status(404).json({ error: 'Audiobook not found' });

        const written = await dl.replaceCover(name + '-audio', url);
        if (!written) return res.status(502).json({ error: 'Could not fetch that cover' });

        res.json({ ok: true });
    } catch (e) {
        console.error('LONG-JOHN set-book-cover ERROR:', e);
        res.status(500).json({ error: e.message });
    }
});

/* Categories by hand. They replace the shelf list on every track row of the
   book, and a scan never writes over a list that is already there, so what
   is set here stays set. */
router.put(route(':name/categories'), async function (req, res) {
    try {
        const { name } = req.params;
        const incoming = req.body && req.body.categories;
        if (!Array.isArray(incoming)) return res.status(400).json({ error: 'categories must be a list' });

        const categories = tidyCategories(incoming);
        const [count] = await AudioBook.update({ genre: categories.join(', ') }, { where: { name } });
        if (!count) return res.status(404).json({ error: 'Audiobook not found' });

        res.json({ name, categories });
    } catch (e) {
        console.error('LONG-JOHN set-book-categories ERROR:', e);
        res.status(500).json({ error: e.message });
    }
});

/* Clearing a cover that turned out to be the wrong book. The file goes and
   the card falls back to its icon; the picker is the way to a right one. The
   scanner only fetches a cover for a book it is meeting for the first time,
   so a cleared one stays cleared through rescans. */
router.delete(route(':name/cover'), async function (req, res) {
    try {
        const { name } = req.params;

        const exists = await AudioBook.findOne({ raw: true, attributes: ['id'], where: { name } });
        if (!exists) return res.status(404).json({ error: 'Audiobook not found' });

        await dl.removeCover(name + '-audio');
        res.json({ ok: true });
    } catch (e) {
        console.error('LONG-JOHN clear-book-cover ERROR:', e);
        res.status(500).json({ error: e.message });
    }
});

router.get(`${route(':name')}/zip`, async (req, res) => {
    try {
        const { name } = req.params;
        const record = await AudioBook.findOne({ raw: true, attributes: ['path'], where: { name }, group: ['path'] });

        const fullPath = record?.path || '';
        const dirPath = path.dirname(fullPath);

        if (!fullPath) return res.sendStatus(404);

        streamers.zipFolderStreamer(dirPath, res);
    } catch (e) {
        console.error('LONG-JOHN ERROR:', e);
        res.status(500).json({ error: e.message });
    }
});

router.get(route(':id'), async function (req, res) {
    try {
        const id = req.params.id;
        const file = await AudioBook.findByPk(id);
        streamers.audioStreamer(file.path, req, res);
    } catch (e) {
        console.error('LONG-JOHN ERROR:', e);
        res.status(500);
        res.json({ error: e });
    }
});

router.post(route(), async function (request, response) {
    try {
        const audiobook = await AudioBook.create(request.body, {});
        response.json(audiobook);
    } catch (e) {
        console.error('LONG-JOHN ERROR:', e);
        response.status(500);
        response.json({ error: e });
    }
});

router.put(route(':id'), async function (req, res) {
    const id = req.params.id;
    try {
        const audioBook = await AudioBook.findOne({ where: { id: id } });
        const partData = req.body;
        audioBook.set(partData);
        const part = await audioBook.save();
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
        await AudioBook.destroy({ where: { id: id } });
        res.json('audioBook has been deleted.');
    } catch (e) {
        console.error('LONG-JOHN ERROR:', e);
        res.status(500);
        res.json({ error: e });
    }
});

module.exports = router;
