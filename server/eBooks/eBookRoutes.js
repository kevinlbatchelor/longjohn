const router = require('../util/router');
const route = router.v1Path('eBooks');
const EBook = require('./eBook');
const path = require('path');
const dl = require('../util/downloadCoverArt');

// The shelf list on a row, comma separated like a movie's genre.
const splitGenre = (genre) => String(genre || '').split(',').map((s) => s.trim()).filter(Boolean);
const tidyCategories = (list) => Array.from(new Set(list.map((c) => String(c).trim().slice(0, 60)).filter(Boolean)));

const coverKey = (id) => `${id}-ebook`;

/* What a Kindle's browser needs in order to keep a download rather than
   show it: a type it knows as a book, and a name ending in the format. The
   older Kindles only read the MOBI-family types. */
const KINDLE_TYPES = {
    mobi: 'application/x-mobipocket-ebook',
    prc: 'application/x-mobipocket-ebook',
    azw: 'application/vnd.amazon.ebook',
    azw3: 'application/vnd.amazon.mobi8-ebook'
};

const fileNameFor = (row) => `${row.name.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120)}.${row.format || 'mobi'}`;

// One entry per file, in the shape the shelf page draws.
const shape = (row) => {
    const info = row.info || {};
    const file = info.file || {};
    return {
        id: row.id,
        name: row.name,
        authors: (info.authors && info.authors.length) ? info.authors : (file.authors || []),
        series: info.series || null,
        categories: splitGenre(row.genre),
        format: row.format,
        added: row.createdAt
    };
};

const allBooks = async () => {
    const rows = await EBook.findAll({
        raw: true,
        attributes: ['id', 'name', 'genre', 'format', 'info', 'createdAt'],
        order: [['name']]
    });
    return rows.map(shape);
};

router.get(route(), async function (req, res) {
    try {
        res.json(await allBooks());
    } catch (e) {
        console.error('LONG-JOHN ERROR:', e);
        res.status(500).json({ error: e.message });
    }
});

// Ahead of the :id routes, which would otherwise swallow them.
router.get(route('cover-search'), async function (req, res) {
    try {
        const q = (req.query.q || '').trim();
        if (!q) return res.json({ provider: 'books', results: [] });
        res.json(await dl.searchBookCovers(q));
    } catch (e) {
        console.error('LONG-JOHN ebook cover-search ERROR:', e.message);
        res.status(502).json({ error: 'Cover lookup failed: ' + e.message });
    }
});

/* The Kindle page ------------------------------------------------------------
 * The React app is beyond what a Kindle's browser can run, so the shelf is
 * also served as plain HTML with nothing but links: search by a form, filter
 * by category, and a download link per book that the Kindle keeps in its
 * library. Ancient-browser friendly on purpose - no script, no styling to
 * speak of.
 */
const escapeHtml = (text) => String(text)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

router.get(route('kindle'), async function (req, res) {
    try {
        const q = String(req.query.q || '').trim().toLowerCase();
        const category = String(req.query.category || '').trim();
        const author = String(req.query.author || '').trim();

        const books = await allBooks();
        const categories = Array.from(new Set(books.flatMap((b) => b.categories))).sort();

        const shown = books.filter((b) =>
            (!q || b.name.toLowerCase().includes(q) || b.authors.some((a) => a.toLowerCase().includes(q)))
            && (!category || b.categories.includes(category))
            && (!author || b.authors.includes(author))
        );

        const base = route('') + '/';
        const link = (params, label) => {
            const qs = Object.entries(params).filter(([, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
            return `<a href="${base}kindle${qs ? '?' + qs : ''}">${escapeHtml(label)}</a>`;
        };

        const items = shown.map((b) => {
            const by = b.authors.length ? ` &mdash; ${escapeHtml(b.authors.join(', '))}` : '';
            const download = `${base}${b.id}/download/${encodeURIComponent(fileNameFor(b))}`;
            return `<li><b>${escapeHtml(b.name)}</b>${by}<br><a href="${download}">Download</a></li>`;
        }).join('\n');

        res.type('html').send(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>LongJohn eBooks</title></head>
<body>
<h2>eBooks (${shown.length} of ${books.length})</h2>
<form method="get" action="${base}kindle">
<input type="text" name="q" value="${escapeHtml(req.query.q || '')}" size="24"> <input type="submit" value="Search">
</form>
<p>${link({}, 'All')} | ${categories.map((c) => link({ category: c }, c)).join(' | ')}</p>
<ul>
${items || '<li>Nothing matches.</li>'}
</ul>
</body></html>`);
    } catch (e) {
        console.error('LONG-JOHN kindle page ERROR:', e);
        res.status(500).type('text').send('Something went wrong: ' + e.message);
    }
});

/* The file itself, as an attachment named for the book. The name in the URL
   is decorative: it is there so the link ends in .mobi, which is what the
   Kindle's browser goes by. */
router.get(route(':id/download{/:filename}'), async function (req, res) {
    try {
        const row = await EBook.findByPk(req.params.id, { raw: true });
        if (!row) return res.sendStatus(404);

        res.type(KINDLE_TYPES[row.format] || 'application/octet-stream');
        res.download(row.path, fileNameFor(row), function (err) {
            if (!err || res.headersSent) return;
            res.sendStatus(err.code === 'ENOENT' ? 404 : 500);
        });
    } catch (e) {
        console.error('LONG-JOHN ebook download ERROR:', e);
        res.status(500).json({ error: e.message });
    }
});

router.post(route(':id/cover'), async function (req, res) {
    try {
        const url = req.body && req.body.url;
        if (!url) return res.status(400).json({ error: 'Missing url' });

        const row = await EBook.findByPk(req.params.id, { raw: true, attributes: ['id'] });
        if (!row) return res.status(404).json({ error: 'eBook not found' });

        const written = await dl.replaceCover(coverKey(row.id), url);
        if (!written) return res.status(502).json({ error: 'Could not fetch that cover' });
        res.json({ ok: true });
    } catch (e) {
        console.error('LONG-JOHN set-ebook-cover ERROR:', e);
        res.status(500).json({ error: e.message });
    }
});

router.delete(route(':id/cover'), async function (req, res) {
    try {
        const row = await EBook.findByPk(req.params.id, { raw: true, attributes: ['id'] });
        if (!row) return res.status(404).json({ error: 'eBook not found' });

        await dl.removeCover(coverKey(row.id));
        res.json({ ok: true });
    } catch (e) {
        console.error('LONG-JOHN clear-ebook-cover ERROR:', e);
        res.status(500).json({ error: e.message });
    }
});

// Categories by hand replace the shelf list, and a scan never writes over one.
router.put(route(':id/categories'), async function (req, res) {
    try {
        const incoming = req.body && req.body.categories;
        if (!Array.isArray(incoming)) return res.status(400).json({ error: 'categories must be a list' });

        const categories = tidyCategories(incoming);
        const [count] = await EBook.update({ genre: categories.join(', ') }, { where: { id: req.params.id } });
        if (!count) return res.status(404).json({ error: 'eBook not found' });

        res.json({ id: Number(req.params.id), categories });
    } catch (e) {
        console.error('LONG-JOHN set-ebook-categories ERROR:', e);
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
