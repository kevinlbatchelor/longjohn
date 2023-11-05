const router = require('../util/router');
const Movie = require('./movie');
const route = router.v1Path('subs');
const streamers = require('../streaming/streamers');

router.get(route(':id'), async function (req, res) {
    try {
        const id = req.params.id;
        const file = await Movie.findByPk(id);

        let newStr = file.path.slice(0, -3);
        newStr = newStr + 'vtt';
        streamers.subTitleStreamer(newStr, req, res);
    } catch (e) {
        console.error('LONG-JOHN ERROR:', e);
        res.status(500);
        res.json({ error: e });
    }
});

module.exports = router;
