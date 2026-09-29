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

/* Zip downloads are cached on disk, inside the book's own folder, so a book is
   zipped once and served off the drive after that. The archive is built into
   a .part file and only renamed to the real name when it finishes cleanly:
   a cancelled download, a full disk or a restart mid-zip must never leave a
   short file behind that every later download is then served as complete.

   The scanner only registers .mp3 files, so neither the zip nor the .part is
   ever taken for a track. MP3 data does not compress, so the entries are
   stored rather than deflated - much lighter on a Pi. */

// Folders with a build in flight. A second request for the same book while
// the first is still zipping gets its own stream and leaves the cache alone.
const zipsInProgress = new Set();

Streamers.zipFolderStreamer = function (folderPath, res) {
    fs.access(folderPath, fs.constants.R_OK, function (err) {
        if (err) return res.sendStatus(404);

        const zipName = path.basename(folderPath) + '.zip';
        const cachedZip = path.join(folderPath, zipName);
        const partZip = cachedZip + '.part';

        if (fs.existsSync(cachedZip)) {
            const stat = fs.statSync(cachedZip);
            res.set({
                'Content-Type': 'application/zip',
                'Content-Disposition': 'attachment; filename="' + zipName + '"',
                'Content-Length': stat.size
            });
            return fs.createReadStream(cachedZip).pipe(res);
        }

        res.set({
            'Content-Type': 'application/zip',
            'Content-Disposition': 'attachment; filename="' + zipName + '"'
        });

        const archive = archiver('zip', { store: true });

        archive.on('error', function (e) {
            console.error('ARCHIVE ERROR:', e);
            if (!res.headersSent) res.status(500);
            res.end();
        });

        // Set once every byte has been pushed out, after which a client that
        // goes away has nothing left to cut short.
        let archiveEnded = false;
        archive.on('end', function () { archiveEnded = true; });

        archive.pipe(res);

        res.on('close', function () {
            if (!archiveEnded) archive.abort();
        });

        const writeCache = !zipsInProgress.has(folderPath);
        if (writeCache) {
            zipsInProgress.add(folderPath);

            let settled = false;
            const cacheStream = fs.createWriteStream(partZip);

            // Drops the part file and the in-flight mark; safe to call twice.
            const abandon = function (reason) {
                if (settled) return;
                settled = true;

                zipsInProgress.delete(folderPath);
                archive.unpipe(cacheStream);
                cacheStream.destroy();
                fs.unlink(partZip, function () {});
                console.warn('zip cache for ' + zipName + ' abandoned: ' + reason);
            };

            cacheStream.on('error', function (e) {
                // The client's copy carries on; only the cache is given up.
                abandon(e.message);
            });

            cacheStream.on('finish', function () {
                if (settled) return;
                settled = true;

                zipsInProgress.delete(folderPath);
                fs.rename(partZip, cachedZip, function (e) {
                    if (e) {
                        console.error('could not finish zip cache for ' + zipName + ':', e.message);
                        fs.unlink(partZip, function () {});
                    }
                });
            });

            archive.on('error', function (e) { abandon(e.message); });

            /* A client that goes away part way stops the archive, so the cache
               would never fill up. Better to throw the part away than wait. */
            res.on('close', function () {
                if (!archiveEnded) abandon('download cancelled');
            });

            archive.pipe(cacheStream);
        }

        archive.glob('**/*', { cwd: folderPath, ignore: ['*.zip', '*.zip.part'] });
        archive.finalize();
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
