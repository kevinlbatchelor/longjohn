let router = require('../util/router');
let Movie = require('./movie');
let route = router.v1Path('subs');
const streamers = require('../streaming/streamers');

router.get(route(':id'), function (req, res) {
    let id = req.params.id;
    Movie.findById(id)
        .then((file) => {
            let newStr = file.path.slice(0, -3);
            newStr = newStr + 'vtt';
            streamers.subTitleStreamer(newStr, req, res);
        });
});

module.exports = router;
