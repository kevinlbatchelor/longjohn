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
            limit: 2000
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
            fs.stat(part.path, function(err, stats) {
                if (err) {
                    if (err.code === 'ENOENT') {
                        // 404 Error if file not found
                        return res.sendStatus(404);
                    }
                    res.end(err);
                }
                let range = req.headers.range;
                if (!range) {
                    // 416 Wrong range
                    return res.sendStatus(416);
                }
                let positions = range.replace(/bytes=/, "").split("-");
                let start = parseInt(positions[0], 10);
                let total = stats.size;
                let end = positions[1] ? parseInt(positions[1], 10) : total - 1;
                let chunksize = (end - start) + 1;

                res.writeHead(206, {
                    "Content-Range": "bytes " + start + "-" + end + "/" + total,
                    "Accept-Ranges": "bytes",
                    "Content-Length": chunksize,
                    "Content-Type": "video/mp4"
                });

                let stream = fs.createReadStream(part.path, { start: start, end: end })
                    .on("open", function() {
                        stream.pipe(res);
                    }).on("error", function(err) {
                        res.end(err);
                    });
            });
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
