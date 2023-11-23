const router = require('../util/router');
const Movie = require('../movie/movie.js');
const tvRoute = router.v1Path('tv');
const coverRoute = router.v1Path('cover');
const _ = require('lodash');
const streamers = require('../streaming/streamers');
const { Op } = require('sequelize');
const os = require('os');
const config = require('../util/config');
// tv shows share a data model with movies for now so use there sequelize data model in movie.js

const osPathCharacter = os.platform() === 'win32' ? '\\' : '/';

router.get(tvRoute(), async function (req, res) {
    try {
        const category = _.get(req, 'query.category', null);
        const name = _.get(req, 'query.name', null);
        const list = await Movie.findAndCountAll(
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
                order: [['createdAt', 'DESC']],
                offset: 0,
                limit: 100000
            });

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
    } catch (e) {
        console.error('LONG-JOHN ERROR:', e);
        res.status(500);
        res.json({ error: e });
    }
});

router.get(tvRoute(':id'), async function (req, res) {
    try {
        const id = req.params.id;
        const file = await Movie.findByPk(id);
        streamers.videoStreamer(file.path, req, res);
    } catch (e) {
        console.error('LONG-JOHN ERROR:', e);
        res.status(500);
        res.json({ error: e });
    }
});

router.get(coverRoute(':id'), function (req, res) {
    try {
        const fileName = req.params.id;
        streamers.imageStreamer(fileName, req, res);
    } catch (e) {
        console.error('LONG-JOHN ERROR:', e);
        res.status(500);
        res.json({ error: e });
    }
});

router.post(tvRoute(), async function (request, response) {
    try {
        const movie = await Movie.create(request.body, {});
        response.json(movie);
    } catch (e) {
        console.error('LONG-JOHN ERROR:', e);
        response.status(500);
        response.json({ error: e });
    }
});

router.put(tvRoute(':id'), async function (req, res) {
    try {
        const id = req.params.id;

        const movie = await Movie.findOne({ where: { id: id } });
        const partData = req.body;
        movie.set(partData);
        const part = await movie.save();
        res.json(part);
    } catch (e) {
        console.error('LONG-JOHN ERROR:', e);
        res.status(500);
        res.json({ error: e });
    }
});

router.delete(tvRoute(':id'), async function (req, res) {
    try {
        const id = req.params.id;
        await Movie.destroy({ where: { id: id } })
        res.json('Movie has been deleted.');
    } catch (e) {
        console.error('LONG-JOHN ERROR:', e);
        res.status(500);
        res.json({ error: e });
    }
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