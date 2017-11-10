let router = require('../util/router');
let error = require('../util/error');
let Movie = require('./movie');
let route = router.v1Path('movie');
let scanner = require('../scanner/scanner');
let fs = require('fs');
let _ = require('lodash');
const streamers = require('../streaming/streamers');

router.get(route(), function (req, res) {
    let category = _.get(req, 'query.category', null);
    let name = _.get(req, 'query.name', null);
    Movie.findAndCountAll(
        {
            where: {
                genre: {
                    $like: `%${category}%`
                },
                name: {
                    $ilike: `%${name}%`
                }
            },
            order: [],
            offset: 0,
            limit: 8
        })
        .then(function (list) {
            list.rows.map((movie) => {
                movie.name = _.startCase(movie.name)
                return movie;
            });

            res.json(list);
        }).catch(function (err) {
        console.log(err);
    });
});

router.get(route(':id'), function (req, res) {
    let id = req.params.id;
    Movie.findById(id)
        .then((file) => {
            streamers.videoStreamer(file.path, req, res);
        });
});

router.post(route(), function (request, response) {
    Movie.create(request.body, {}).then(function (movie) {
        response.json(movie);
    }, function (err) {
        console.log(err);
    });
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
