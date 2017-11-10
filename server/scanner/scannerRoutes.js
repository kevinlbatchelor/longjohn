let router = require('../util/router');
let route = router.v1Path('scan');
let scanner = require('../scanner/scanner');

router.get(route(), function (req, res) {
    scanner.scan().then(function (list) {
        res.json(list);
    }).catch(function (err) {
        console.log(err);
    })
});

module.exports = router;