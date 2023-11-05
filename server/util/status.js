const router = require('../util/router');
const nodeInfo = require('../../package.json');

router.get('/status', function (req, res) {
    res.json({
        status: 'online',
        version: nodeInfo.version
    });
});

module.exports = router;
