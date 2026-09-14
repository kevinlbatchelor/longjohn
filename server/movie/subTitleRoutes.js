const router = require('../util/router');
const route = router.v1Path('subs');
const streamers = require('../streaming/streamers');
const moviePath = require('./moviePath');

router.get(route(':id'), async function (req, res) {
    try {
        const id = req.params.id;
        const filePath = await moviePath.pathFor(id);
        if (!filePath) return res.sendStatus(404);

        const newStr = filePath.slice(0, -3) + 'vtt';
        streamers.subTitleStreamer(newStr, req, res);
    } catch (e) {
        console.error('LONG-JOHN ERROR:', e);
        res.status(500);
        res.json({ error: e });
    }
});

module.exports = router;
