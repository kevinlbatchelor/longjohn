let router = require('../util/router');
let route = router.v1Path('scan');
let scanner = require('../scanner/scanner');
let config = require('../util/config');

router.get(route('TV'), function (req, res) {
    scanner.scanForMovies(config.TV, true).then(function (list) {
        res.json(list);
    }).catch(function (err) {
        console.log(err);
    })
});

router.get(route(), function (req, res) {
    scanner.scanForMovies(config.movies).then(function (list) {
        res.json(list);
    }).catch(function (err) {
        console.log(err);
    })
});

router.get(route('audio'), function (req, res) {
    scanner.scanForAudio(config.audioBooks).then(function (list) {
        res.json(list);
    }).catch(function (err) {
        console.log(err);
    })
});

module.exports = router;