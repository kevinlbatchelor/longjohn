let router = require('../util/router');
let Movie = require('../movie/movie.js');
let tvRoute = router.v1Path('tv');
let coverRoute = router.v1Path('cover');
let _ = require('lodash');
const streamers = require('../streaming/streamers');
const { Op } = require('sequelize');
const os = require('os');
const config = require('../util/config');
// tv shows share a data modle with movies for now so use there sequelize data model in movie.js

const osPathCharacter = os.platform() === 'win32' ? '\\' : '/';

router.get(tvRoute(), function (req, res) {
    let category = _.get(req, 'query.category', null);
    let name = _.get(req, 'query.name', null);
    Movie.findAndCountAll(
        {
            raw: true,
            where: {
                genre: {
                    [Op.like]: `%${category}%`
                },
                name: {
                    [Op.iLike]: `%${name}%`
                }
            },
            order: ['name'],
            offset: 0,
            limit: 1000
        }).then(function (list) {

        const shows = list.rows.reduce((acc, movie) => {
            const show = {};
            const path = movie.path;
            const pathDetails = path.split(osPathCharacter);
            const tvFolderNameIndex = pathDetails.indexOf(config.tvFolderName);
            const tvTitleIndex = tvFolderNameIndex + 1;

            show.name = pathDetails[tvTitleIndex];
            show.episode = movie.name;
            show.id = movie.id;

            acc.push(show);
            return acc;
        }, []);

        const uniqueShows = _.groupBy(shows, 'name');
        // reorder data for UI
        const reduction = Object.keys(uniqueShows).reduce((acc, i) => {
            const showObj = {};
            showObj.episodes = uniqueShows[i];
            showObj.name = i;
            acc.push(showObj);
            return acc;

        }, []);

        const data = {
            rows: reduction
        };
        res.json(data);
    }).catch(function (err) {
        console.log(err);
    });
});

router.get(tvRoute(':id'), function (req, res) {
    let id = req.params.id;
    Movie.findByPk(id)
        .then((file) => {
            streamers.videoStreamer(file.path, req, res);
        });
});

router.get(coverRoute(':id'), function (req, res) {
    let fileName = req.params.id;
    streamers.imageStreamer(fileName, req, res);
});

router.post(tvRoute(), function (request, response) {
    Movie.create(request.body, {}).then(function (movie) {
        response.json(movie);
    }, function (err) {
        console.log(err);
    });
});

router.put(tvRoute(':id'), function (req, res) {
    let id = req.params.id;

    Movie.findOne({ where: { id: id } }).then(function (movie) {
        let partData = req.body;
        movie.set(partData);
        movie.save().then(function (part) {
            res.json(part);
        });
    });
});

router.delete(tvRoute(':id'), function (req, res) {
    let id = req.params.id;
    Movie.destroy({ where: { id: id } }).then(function () {
        res.json('Movie has been deleted.');
    });
});

module.exports = router;

// format for  ui
// [
//     {
//         "episodes": [
//             {
//                 "name": "Show 2",
//                 "episode": "star trek 2",
//                 "id": 57
//             },
//             {
//                 "name": "Show 2",
//                 "episode": "star trek1",
//                 "id": 58
//             }
//         ],
//         "name": "Show 2"
//     },
//     {
//         "episodes": [
//             {
//                 "name": "Show 1",
//                 "episode": "test 1",
//                 "id": 59
//             },
//             {
//                 "name": "Show 1",
//                 "epi    sode": "test 2",
//                 "id": 60
//             }
//         ],
//         "name": "Show 1"
//     }
// ]