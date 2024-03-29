const router = require('../util/router');
const Movie = require('./movie');
const route = router.v1Path('movie');
const coverRoute = router.v1Path('cover');
const _ = require('lodash');
const streamers = require('../streaming/streamers');
const { Op } = require('sequelize');

router.get(route(), async function (req, res) {
    const category = _.get(req, 'query.category', 'null');
    const name = _.get(req, 'query.name', null);
    try {
        const list = await Movie.findAndCountAll(
            {
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
                limit: 1000
            });

        list.rows.map((movie) => {
            movie.name = _.startCase(movie.name);
            return movie;
        });
        res.json(list);
    } catch (e) {
        console.error('LONG-JOHN ERROR:', e);
        res.status(500);
        res.json({ error: e });
    }
});

router.get(route(':id'), async function (req, res) {
    const id = req.params.id;
    const file = await Movie.findByPk(id);
    streamers.videoStreamer(file.path, req, res);
});

router.get(coverRoute(':id'), function (req, res) {
    const fileName = req.params.id;
    streamers.imageStreamer(fileName, req, res);
});

router.post(route(), async function (request, response) {
    try {
        const movie = await Movie.create(request.body, {});
        response.json(movie);
    } catch (e) {
        console.error('LONG-JOHN ERROR:', e);
        response.status(500);
        response.json({ error: e });
    }
});

router.put(route(':id'), async function (req, res) {
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

router.delete(route(':id'), async function (req, res) {
    try {
        const id = req.params.id;
        await Movie.destroy({ where: { id: id } });
        res.json('Movie has been deleted.');
    } catch (e) {
        console.error('LONG-JOHN ERROR:', e);
        res.status(500);
        res.json({ error: e });
    }
});

module.exports = router;
