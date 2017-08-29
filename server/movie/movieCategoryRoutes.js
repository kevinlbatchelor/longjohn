let Category = require('./movieCategory');

let router = require('../util/router');

let route = router.v1Path('movieCategory');

router.get(route(), function (req, res) {
    Category.findAll()
        .then(function (list) {
            res.json(list);
        }).catch(function (err) {
        console.log(err);
    });
});

module.exports = router;
