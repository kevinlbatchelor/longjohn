const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const Movie = require('../movie/movie');
const { unlinkQuietly } = require('../movie/removeMovie');
const config = require('../util/config');

/* What a show is, and what is left when its episodes go -------------------------
 * A show has no row of its own - it is a grouping of episode rows on the folder
 * name sitting under the TV folder in each row's path. So there is no show
 * record to delete: the last episode row going is the show going.
 *
 * What does outlive the rows is on disk - the cover the scanner downloaded under
 * the show's name, and the folder the episodes sat in - so that is what gets
 * cleaned up once nothing is left to reference it.
 */

const osPathCharacter = path.sep;

function segmentsOf(filePath) {
    const parts = filePath.split(osPathCharacter);
    const at = parts.indexOf(config.tvFolderName);

    // A movie's path never passes through the TV folder, and a file sitting
    // loose in it has no show to speak of.
    if (at === -1 || !parts[at + 1]) return null;

    return { parts, at };
}

function showNameFor(filePath) {
    const found = segmentsOf(filePath);
    return found ? found.parts[found.at + 1] : null;
}

// Everything up to and including the show's own folder, so season subfolders
// below it are still inside what gets pruned.
function showFolderFor(filePath) {
    const found = segmentsOf(filePath);
    return found ? found.parts.slice(0, found.at + 2).join(osPathCharacter) : null;
}

/* Only the two columns the grouping reads. The genre filter is the same one the
   catalogue uses - the show name itself is not a column, so it has to be derived
   per row rather than queried. */
async function episodeRowsFor(showName) {
    const rows = await Movie.findAll({
        raw: true,
        attributes: ['id', 'path'],
        where: { genre: { [Op.like]: '%TV%' } }
    });

    return rows.filter((row) => row.path && showNameFor(row.path) === showName);
}

/* Depth first, and rmdir rather than a recursive remove: rmdir refuses a
   directory with anything still in it, so a stray file the scanner never
   indexed keeps its folder instead of being taken out with it. */
async function pruneEmptyDirs(dir) {
    let entries;
    try {
        entries = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch (e) {
        /* ENOTDIR is the loose-file case: a video sitting directly in the TV
           folder groups as a show of its own, and its "folder" is the file. */
        if (e.code !== 'ENOENT' && e.code !== 'ENOTDIR') {
            console.error('LONG-JOHN read show folder:', e);
        }
        return;
    }

    for (const entry of entries) {
        if (entry.isDirectory()) await pruneEmptyDirs(path.join(dir, entry.name));
    }

    try {
        await fs.promises.rmdir(dir);
    } catch (e) {
        // ENOTEMPTY is the normal answer when something is still in there.
        if (e.code !== 'ENOTEMPTY' && e.code !== 'ENOENT') {
            console.error('LONG-JOHN rmdir show folder:', e);
        }
    }
}

/* Call after removing an episode. Does nothing while the show still has
   episodes, so it is safe to call on every episode delete rather than only the
   one that happens to be last. Resolves true when the show was cleaned up. */
async function cleanUpShowIfEmpty(showName, showFolder) {
    if (!showName) return false;

    const remaining = await episodeRowsFor(showName);
    if (remaining.length) return false;

    await unlinkQuietly(path.join(config.cover, showName + '.jpg'), 'show cover');
    if (showFolder) await pruneEmptyDirs(showFolder);

    return true;
}

module.exports = { showNameFor, showFolderFor, episodeRowsFor, cleanUpShowIfEmpty };
