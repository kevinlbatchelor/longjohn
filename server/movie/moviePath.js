const Movie = require('./movie');

/* File paths for the streaming routes -----------------------------------------
 * A single episode is served over dozens of range requests - more once someone
 * starts seeking - and every one of them used to pull the whole row back, imdb
 * JSONB and all, to read one column. The path of a file cannot change while it
 * is playing, so the lookup reads one column and the answer is kept for the
 * range requests that follow.
 *
 * Bounded on purpose: a stick has little to spare and the working set is
 * whatever is being watched right now, not the whole library.
 */

const MAX_ENTRIES = 200;

const paths = new Map();

const MoviePath = {};

MoviePath.pathFor = async function (id) {
    if (paths.has(id)) {
        // Re-insert so the entries in play stay at the young end of the Map.
        const hit = paths.get(id);
        paths.delete(id);
        paths.set(id, hit);
        return hit;
    }

    const movie = await Movie.findByPk(id, { raw: true, attributes: ['path'] });
    const filePath = movie ? movie.path : null;

    // A miss is not worth remembering - it is either a bad id or a row that is
    // about to exist.
    if (!filePath) return null;

    if (paths.size >= MAX_ENTRIES) {
        paths.delete(paths.keys().next().value);
    }
    paths.set(id, filePath);

    return filePath;
};

// Ids arrive as route params (strings) and as numbers from the models, so drop
// both spellings rather than trusting the caller to pick one.
MoviePath.forget = function (id) {
    paths.delete(id);
    paths.delete(String(id));
    paths.delete(Number(id));
};

MoviePath.clear = function () {
    paths.clear();
};

module.exports = MoviePath;
