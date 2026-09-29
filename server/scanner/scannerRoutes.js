const router = require('../util/router');
const route = router.v1Path('scan');
const scanner = require('../scanner/scanner');
const config = require('../util/config');

/* A library's folders as a list, however the config spelled them. A single
   folder written as a plain string used to be looped over letter by letter,
   which ended in a hunt for a folder called "m". */
const folders = (value) => [].concat(value || []).filter(Boolean);

router.get(route('TV'), async function (req, res) {
    try {
        const list = await scanner.scanForMovies(folders(config.TV), true);
        res.json(list);
    } catch (e) {
        console.error('LONG-JOHN ERROR:', e);
        res.status(500);
        res.json({ error: e });
    }
});

router.get(route(), async function (req, res) {
    try {
        const list = await scanner.scanForMovies(folders(config.movies));
        res.json(list);
    } catch (e) {
        console.error('LONG-JOHN ERROR:', e);
        res.status(500);
        res.json({ error: e });
    }
});

router.get(route('audio'), async function (req, res) {
    try {
        const list = await scanner.scanForAudio(folders(config.audioBooks));
        res.json(list);
    } catch (e) {
        console.error('LONG-JOHN ERROR:', e);
        res.status(500);
        res.json({ error: e });
    }
});

router.get(route('ebooks'), async function (req, res) {
    try {
        const list = await scanner.scanForEbooks(folders(config.eBooks));
        res.json(list || []);
    } catch (e) {
        // e.message, not e: an Error serialises to {} and tells the page nothing.
        res.status(500).json({ error: e.message || String(e) });
    }
});

module.exports = router;