const router = require('../util/router');
const AudioBook = require('./audioBook');
const route = router.v1Path('audioBooks');
const streamers = require('../streaming/streamers');

router.get(route(), async function (req, res) {
    try {
        const list = await AudioBook.findAndCountAll(
            {
                attributes: ['name'],
                group: ['name'],
                order: ['name'],
                offset: 0,
                limit: 1000
            });
        list.rows.map((audioBook) => {
            audioBook.name = audioBook.name;
            return audioBook;
        });

        res.json(list);
    } catch (e) {
        console.error('LONG-JOHN ERROR:', e);
        res.status(500);
        res.json({ error: e });
    }
});

router.get(route('playlist'), async function (req, res) {
    try {
        const book = req.query.book;
        const list = await AudioBook.findAll({
            where: {
                name: book
            },
            order: ['track']
        });
        res.json(list);
    } catch (e) {
        console.error('LONG-JOHN ERROR:', e);
        res.status(500);
        res.json({ error: e });
    }
});

router.get(route(':id'), async function (req, res) {
    try {
        const id = req.params.id;
        const file = await AudioBook.findByPk(id);
        streamers.audioStreamer(file.path, req, res);
    } catch (e) {
        console.error('LONG-JOHN ERROR:', e);
        res.status(500);
        res.json({ error: e });
    }
});

router.post(route(), async function (request, response) {
    try {
        const audiobook = await AudioBook.create(request.body, {});
        response.json(audiobook);
    } catch (e) {
        console.error('LONG-JOHN ERROR:', e);
        response.status(500);
        response.json({ error: e });
    }
});

router.put(route(':id'), async function (req, res) {
    const id = req.params.id;
    try {
        const audioBook = await AudioBook.findOne({ where: { id: id } });
        const partData = req.body;
        audioBook.set(partData);
        const part = await audioBook.save();
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
        await AudioBook.destroy({ where: { id: id } });
        res.json('audioBook has been deleted.');
    } catch (e) {
        console.error('LONG-JOHN ERROR:', e);
        res.status(500);
        res.json({ error: e });
    }
});

module.exports = router;
