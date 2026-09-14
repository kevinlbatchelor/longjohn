const fs = require('fs');
const path = require('path');
const Movie = require('./movie');
const moviePath = require('./moviePath');
const config = require('../util/config');

/* Deleting a bad file -----------------------------------------------------------
 * Movies and TV episodes are the same row in the same table, so a bad file is
 * removed the same way whichever list it was spotted from: the video goes, the
 * matching .vtt goes with it, the downloaded cover goes, and the row is dropped
 * for real rather than soft-deleted - a paranoid row would keep the scanner from
 * picking the file up again if it is ever replaced.
 */

async function unlinkQuietly(target, what) {
    try {
        await fs.promises.unlink(target);
    } catch (e) {
        if (e.code !== 'ENOENT') console.error(`LONG-JOHN unlink ${what}:`, e);
    }
}

// Resolves to false when there is no such row, so callers can answer 404.
async function removeMovie(id) {
    const movie = await Movie.findByPk(id, { paranoid: false });
    if (!movie) return false;

    if (movie.path) {
        await unlinkQuietly(movie.path, 'movie file');

        const dir = path.dirname(movie.path);
        const base = path.basename(movie.path, path.extname(movie.path));
        await unlinkQuietly(path.join(dir, base + '.vtt'), 'subtitle');
    }

    await unlinkQuietly(path.join(config.cover, id + '.jpg'), 'cover');

    await movie.destroy({ force: true });
    moviePath.forget(id);

    return true;
}

module.exports = { removeMovie, unlinkQuietly };
