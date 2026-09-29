/* Turning a filename into something a title lookup can answer -------------------
 * A row's name is the file's name minus its extension, so what reaches OMDb is
 * "Blade.Runner.1982.1080p.BluRay.x264" unless something cleans it up first -
 * and OMDb has never heard of that. Everything from the year rightwards in a
 * scene filename is release detail rather than title, so the year doubles as
 * the place to cut, and it is worth keeping: it separates the two films that
 * share a name.
 *
 * Lives in util rather than beside its caller because the scanner cleans show
 * folder names with it too.
 */

const NOISE = /\b(1080p|720p|480p|2160p|4k|uhd|bluray|blu-ray|brrip|bdrip|dvdrip|webrip|web-dl|webdl|hdtv|hdrip|x264|x265|h264|h265|hevc|xvid|aac|ac3|dts|remux|proper|repack|extended|unrated|limited|internal)\b/gi;
const YEAR = /\b(19\d{2}|20\d{2})\b/;

function cleanTitle(raw) {
    if (!raw) return { title: null, year: null };

    let text = String(raw).replace(/[._]+/g, ' ');

    const matched = YEAR.exec(text);
    const year = matched ? Number(matched[1]) : null;
    if (matched) text = text.slice(0, matched.index);

    text = text
        .replace(NOISE, ' ')
        .replace(/[[\]](){}]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    return { title: text || null, year };
}

module.exports = { cleanTitle };
