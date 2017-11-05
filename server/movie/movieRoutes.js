let router = require('../util/router');
let error = require('../util/error');
let Movie = require('./movie');
let route = router.v1Path('movie');
let scanner = require('../scanner/scanner');
let fs = require('fs');

router.get(route(), function (req, res) {
    Movie.findAndCountAll(
        {
            where: {},
            order: [],
            offset: 0,
            limit: 10
        })
        .then(function (list) {
            res.json(list);
        }).catch(function (err) {
        console.log(err);
    });
});

router.get(route(':id'), function (req, res) {
    let id = req.params.id;
    Movie.findById(id)
        .then(function (part) {
            res.writeHead(200, {'Content-Type': 'video/mp4'});
            let rs = fs.createReadStream(part.path);
            rs.pipe(res);
        })
    ;
});

router.post(route(), function (request, response) {
    Movie.create(request.body, {})
        .then(function (movie) {
            response.json(movie);
        }, function (err) {
            console.log(err);
        })
    ;
});

router.put(route(':id'), function (req, res) {
    let id = req.params.id;

    Movie.findOne({where: {id: id}}).then(function (movie) {
        let partData = req.body;
        movie.set(partData);
        movie.save().then(function (part) {
            res.json(part);
        });
    });
});

router.delete(route(':id'), function (req, res) {
    let id = req.params.id;
    Movie.destroy({where: {id: id}}).then(function () {
        res.json('Movie has been deleted.');
    });
});

module.exports = router;
