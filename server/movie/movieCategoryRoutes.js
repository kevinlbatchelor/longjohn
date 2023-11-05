let Category = require('./movieCategory');
let router = require('../util/router');
let route = router.v1Path('categories');

router.get(route(), async function (req, res) {
    try {
        const list = await Category.findAll();
        res.json(list);
    } catch (e) {
        console.error('LONG-JOHN ERROR:', e);
        res.status(500);
        res.json({ error: e });
    }
});

module.exports = router;
