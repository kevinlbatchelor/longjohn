let router = require('../util/router');
let AudioBook = require('./audioBook');
let route = router.v1Path('audioBooks');
let _ = require('lodash');
const streamers = require('../streaming/streamers');

router.get(route(), function (req, res) {
    AudioBook.findAndCountAll(
        {
            attributes: ['name'],
            group: ['name'],
            order: ['name'],
            offset: 0,
            limit: 1000
        })
        .then(function (list) {
            list.rows.map((audioBook) => {
                audioBook.name = _.startCase(audioBook.name);
                return audioBook;
            });

            res.json(list);
        }).catch(function (err) {
        console.log(err);
    });
});

router.get(route('playlist'), function (req, res) {
    let book = req.query.book;
    AudioBook.findAll({
        where: {
            name: book
        }
    }).then((list) => {
        res.json(list);
    });
});

router.get(route(':id'), function (req, res) {
    let id = req.params.id;
    console.log(id)
    AudioBook.findById(id).then((file) => {
        console.log(file.path)
        streamers.audioStreamer(file.path, req, res);
    });
});

router.post(route(), function (request, response) {
    AudioBook.create(request.body, {}).then(function (audioBook) {
        response.json(audioBook);
    }, function (err) {
        console.log(err);
    });
});

router.put(route(':id'), function (req, res) {
    let id = req.params.id;

    AudioBook.findOne({where: {id: id}}).then(function (audioBook) {
        let partData = req.body;
        audioBook.set(partData);
        audioBook.save().then(function (part) {
            res.json(part);
        });
    });
});

router.delete(route(':id'), function (req, res) {
    let id = req.params.id;
    AudioBook.destroy({where: {id: id}}).then(function () {
        res.json('audioBook has been deleted.');
    });
});

module.exports = router;
