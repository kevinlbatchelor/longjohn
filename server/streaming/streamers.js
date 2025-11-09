const fs = require('fs');
const _ = require('lodash');
const config = require('../util/config.js');
const os = require('os');
const osPathCharacter = os.platform() === 'win32' ? '\\' : '/';
const path = require('path');
const archiver = require('archiver');

const Streamers = {};

Streamers.videoStreamer = function (path, req, res) {
    fs.stat(path, function (err, stats) {
        if (err) {
            if (err.code === 'ENOENT') {
                // 404 Error if file not found
                return res.sendStatus(404);
            }
            res.end(err);
        }
        const range = req.headers.range;
        if (!range) {
            // 416 Wrong range
            return res.sendStatus(416);
        }
        const positions = range.replace(/bytes=/, '').split('-');
        const start = parseInt(positions[0], 10);
        const total = stats.size;
        const end = positions[1] ? parseInt(positions[1], 10) : total - 1;
        const chunksize = (end - start) + 1;

        res.writeHead(206, {
            'Content-Range': 'bytes ' + start + '-' + end + '/' + total,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': 'video/mp4'
        });

        const stream = fs.createReadStream(path, { start: start, end: end })
            .on('open', function () {
                stream.pipe(res);
            }).on('error', function (err) {
                res.end(err);
            });
    });
};

Streamers.subTitleStreamer = function (path, req, res) {
    fs.stat(path, function (err, stats) {
        if (err) {
            if (err.code === 'ENOENT') {
                // 404 Error if file not found
                return res.sendStatus(404);
            }
            res.end(err);
        }

        res.writeHead(206, {
            'Accept-Ranges': 'bytes',
            'Content-Type': 'text/vtt'
        });

        const stream = fs.createReadStream(path)
            .on('open', function () {
                stream.pipe(res);
            }).on('error', function (err) {
                res.end(err);
            });
    });
};

Streamers.zipFolderStreamer = function (folderPath, res) {
    // Defensive: make sure the folder exists & is readable
    fs.access(folderPath, fs.constants.R_OK, (err) => {
        if (err) return res.sendStatus(404);
        console.log('------->folderPath', folderPath);
        // Tell the browser it’s a download
        res.set({
            'Content-Type': 'application/zip',
            'Content-Disposition': `attachment; filename="${path.basename(folderPath)}.zip"`
        });

        // Pipe an on‑the‑fly ZIP into the response
        const archive = archiver('zip', { zlib: { level: 9 } });

        archive.on('error', (e) => {
            console.error('ARCHIVE ERROR:', e);
            // Flush whatever has been sent so far, then end the response
            if (!res.headersSent) res.status(500);
            res.end();
        });

        archive.pipe(res);

        // Second arg === false → drop the parent folder, send just its contents
        archive.directory(folderPath, false);

        archive.finalize();          // << starts streaming immediately
    });
};

Streamers.audioStreamer = function (path, req, res) {
    fs.stat(path, function (err, stats) {
        if (err) {
            if (err.code === 'ENOENT') {
                // 404 Error if file not found
                return res.sendStatus(404);
            }
            res.end(err);
        }
        const range = req.headers.range;
        if (!range) {
            // 416 Wrong range
            return res.sendStatus(416);
        }
        const positions = range.replace(/bytes=/, '').split('-');
        const start = parseInt(positions[0], 10);
        const total = stats.size;
        const end = positions[1] ? parseInt(positions[1], 10) : total - 1;
        const chunksize = (end - start) + 1;

        res.writeHead(206, {
            'Content-Range': 'bytes ' + start + '-' + end + '/' + total,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': 'audio/mpeg'
        });

        const stream = fs.createReadStream(path, { start: start, end: end })
            .on('open', function () {
                stream.pipe(res);
            }).on('error', function (err) {
                res.end(err);
            });
    });
};

Streamers.imageStreamer = function (movieId, req, res) {
    const mime = {
        html: 'text/html',
        txt: 'text/plain',
        css: 'text/css',
        gif: 'image/gif',
        jpg: 'image/jpeg',
        png: 'image/png',
        svg: 'image/svg+xml',
        js: 'application/javascript'
    };

    const ext = '.jpg';
    const type = mime[ext] || 'image/jpeg';
    const filePath = config.cover + osPathCharacter + movieId + ext;

    const s = fs.createReadStream(filePath);
    s.on('open', function () {
        res.set('Content-Type', type);
        s.pipe(res);
    });
    s.on('error', function (e) {
        console.error('error getting cover', e);
        res.set('Content-Type', 'text/plain');
        res.status(404).end('Not found');
    });
};

module.exports = Streamers;