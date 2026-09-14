const router = require('../util/router');
const route = router.v1Path('scan');
const scanner = require('../scanner/scanner');
const metadata = require('../movie/metadata');
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

/* Fills in OMDb data for rows that have none. The scanner only looks a title up
   while creating a row, so anything already in the table needs this pass.
   Capped per run and never overwrites by default - ?limit= and ?force=1 override. */
router.get(route('metadata'), async function (req, res) {
    try {
        const limit = Number(req.query.limit) || undefined;
        const force = req.query.force === '1' || req.query.force === 'true';

        const summary = await metadata.backfill({ limit, force });

        // Genres change here, and the TV catalogue is grouped and cached on them.
        require('../tv/tvRoutes').invalidateTvCatalog();

        res.json(summary);
    } catch (e) {
        const status = e.status || 500;
        if (status >= 500) console.error('LONG-JOHN ERROR:', e);
        res.status(status);
        res.json({ error: e.message });
    }
});

module.exports = router;