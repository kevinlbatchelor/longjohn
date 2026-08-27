/*
 * Split a show out of a shared folder into its own, so LongJohn lists it
 * separately - tvRoutes.js derives the show name from the folder, so two series
 * sharing a directory render as one card.
 *
 * Filenames are untouched; only the directory changes. Run it twice, once per
 * machine, the same way as renameFiles.js / renameEpisodes.js:
 *
 *   # on the box holding the media (moves the files)
 *   node server/scripts/moveShow.js --from "D:\TV\Avatar" --to "D:\TV\The Legend of Korra" \
 *        --prefix "The Legend of Korra" [--apply]
 *
 *   # on the server (re-points movie.path, needs no write access to the media)
 *   node server/scripts/moveShow.js --db --from /media/pi/LongJohn/TV/Avatar \
 *        --to "/media/pi/LongJohn/TV/The Legend of Korra" --prefix "The Legend of Korra" [--apply]
 */

const fs = require('fs');

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const useDb = args.includes('--db');

function opt(name) {
    const i = args.indexOf('--' + name);
    return i === -1 ? null : args[i + 1];
}

const from = opt('from');
const to = opt('to');
const prefix = opt('prefix');

if (!from || !to || !prefix) {
    console.error('Usage: moveShow.js --from <dir> --to <dir> --prefix <filename prefix> [--db] [--apply]');
    process.exit(1);
}

// Paths may come from the db in another OS's format, so read the separator off
// the value rather than trusting this host's path module.
function sepOf(p) {
    return p.lastIndexOf('\\') > p.lastIndexOf('/') ? '\\' : '/';
}

function baseOf(p) {
    const cut = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'));
    return p.slice(cut + 1);
}

async function moveFiles() {
    const sep = sepOf(from);
    const matches = fs.readdirSync(from).filter(f => f.startsWith(prefix));

    if (!matches.length) {
        console.log(`No files in ${from} start with "${prefix}".`);
        return;
    }

    console.log(`${matches.length} file(s) to move`);
    console.log(`  ${from}\n  -> ${to}\n`);

    if (!apply) {
        matches.slice(0, 5).forEach(f => console.log(`  PLAN  ${f}`));
        if (matches.length > 5) console.log(`  ... and ${matches.length - 5} more`);
        console.log('\nRe-run with --apply to move them.');
        return;
    }

    if (!fs.existsSync(to)) fs.mkdirSync(to, { recursive: true });

    let moved = 0;
    let failed = 0;

    for (const file of matches) {
        const src = from + sep + file;
        const dst = to + sepOf(to) + file;

        if (fs.existsSync(dst)) {
            console.error(`FAIL  ${file}: already exists at destination`);
            failed++;
            continue;
        }

        try {
            fs.renameSync(src, dst);
            moved++;
        } catch (e) {
            console.error(`FAIL  ${file}: ${e.message}`);
            failed++;
        }
    }

    console.log(`\nApplied: ${moved} moved, ${failed} failed.`);
}

async function moveRows() {
    const { Op } = require('sequelize');
    const db = require('../util/database/db');
    const Movie = require('../movie/movie');

    const sep = sepOf(from);
    const rows = await Movie.findAll({
        where: { path: { [Op.like]: from + sep + prefix + '%' } }
    });

    console.log(`${rows.length} db row(s) under ${from} matching "${prefix}"\n`);

    let updated = 0;
    let missing = 0;
    let failed = 0;

    for (const row of rows) {
        const newPath = to + sepOf(to) + baseOf(row.path);

        if (!fs.existsSync(newPath)) {
            console.error(`SKIP  ${row.id}: no file at ${newPath}`);
            missing++;
            continue;
        }

        console.log(`${apply ? 'REPATH' : 'PLAN  '} ${row.id}: ${row.name}`);

        if (!apply) continue;

        try {
            // Filename is unchanged, so `name` stays as it is - only the dir moves.
            row.set({ path: newPath });
            await row.save();
            updated++;
        } catch (e) {
            console.error(`FAIL  ${row.id}: ${e.message}`);
            failed++;
        }
    }

    console.log(
        `\n${apply ? `Applied: ${updated} repathed` : `Dry run: ${rows.length - missing} to repath`}` +
        `, ${missing} missing, ${failed} failed`
    );

    await db.connection.close();
}

const task = useDb ? moveRows : moveFiles;

task().catch((e) => {
    console.error('LONG-JOHN ERROR:', e);
    process.exit(1);
});
