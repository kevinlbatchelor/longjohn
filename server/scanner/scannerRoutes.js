const router = require('../util/router');
const route = router.v1Path('scan');
const scanner = require('../scanner/scanner');
const config = require('../util/config');

router.get(route('TV'), async function (req, res) {
    try {
        const list = await scanner.scanForMovies(config.TV, true);
        res.json(list);
    } catch (e) {
        console.error('LONG-JOHN ERROR:', e);
        res.status(500);
        res.json({ error: e });
    }
});

router.get(route(), async function (req, res) {
    try {
        const list = await scanner.scanForMovies(config.movies);
        res.json(list);
    } catch (e) {
        console.error('LONG-JOHN ERROR:', e);
        res.status(500);
        res.json({ error: e });
    }
});

router.get(route('audio'), async function (req, res) {
    try {
        const list = await scanner.scanForAudio(config.audioBooks);
        res.json(list);
    } catch (e) {
        console.error('LONG-JOHN ERROR:', e);
        res.status(500);
        res.json({ error: e });
    }
});

module.exports = router;