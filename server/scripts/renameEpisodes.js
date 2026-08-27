/*
 * One-off data fix: rename TV episode files (and their DB rows) to SxxEyy order.
 *
 * Files scanned from a flat show folder only carry an episode number, so shows
 * whose seasons live side by side sort into each other. This rewrites both the
 * file on disk and the movie row so `name` sorts in broadcast order and the UI's
 * SxxEyy label matches.
 *
 * Run ON the machine that holds the media (the Pi) so the renames actually land:
 *   node server/scripts/renameEpisodes.js            # audit + dry run
 *   node server/scripts/renameEpisodes.js --apply    # do it
 *
 * If renameFiles.js already renamed the files elsewhere, this adopts them and
 * only re-points the db rows - which works even on a read-only media volume.
 */

const fs = require('fs');
const { Op } = require('sequelize');
const db = require('../util/database/db');
const Movie = require('../movie/movie');

const AVATAR = require('./episodeMap');

const RENAMES = AVATAR;

const apply = process.argv.includes('--apply');

// Paths come out of the DB as whatever the scanning host wrote, so read the
// separator off the value instead of trusting this host's path module.
function splitPath(p) {
    const cut = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'));
    return {
        dir: p.slice(0, cut),
        base: p.slice(cut + 1),
        sep: p[cut]
    };
}

function stemOf(base) {
    const dot = base.lastIndexOf('.');
    return dot === -1 ? base : base.slice(0, dot);
}

// A read-only media mount fails every single rename, so check the volume once
// up front (in dry run too) rather than reporting it 54 times. fs.access(W_OK)
// lies about directories on some platforms, so probe with an actual write.
const writable = new Map();

function isWritable(dir, sep) {
    if (!writable.has(dir)) {
        const probe = dir + sep + '.longjohn-write-probe';
        try {
            fs.writeFileSync(probe, '');
            fs.unlinkSync(probe);
            writable.set(dir, true);
        } catch (e) {
            writable.set(dir, false);
        }
    }
    return writable.get(dir);
}

// The mapping was written from a hand-pasted list, so never assume it covers the
// folder. Compare it against what the db and the disk actually hold before
// renaming anything.
async function audit(dir, sep) {
    const rows = await Movie.findAll({
        where: { path: { [Op.like]: dir + sep + '%' } },
        raw: true
    });

    const mapped = new Set(RENAMES.map(e => e.id));
    const unmapped = rows.filter(r => !mapped.has(r.id));

    let onDisk = [];
    try {
        onDisk = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.mp4'));
    } catch (e) {
        console.error(`Cannot read ${dir} - ${e.message}`);
    }

    const inDb = new Set(rows.map(r => splitPath(r.path).base));
    const unscanned = onDisk.filter(f => !inDb.has(f));

    function list(label, items, render) {
        if (!items.length) return;
        console.log(`  ${items.length} ${label}:`);
        items.slice(0, 8).forEach(i => console.log(`    ${render(i)}`));
        if (items.length > 8) console.log(`    ... and ${items.length - 8} more`);
    }

    console.log(`Folder: ${dir}`);
    console.log(`  on disk: ${onDisk.length} mp4   in db: ${rows.length}   in mapping: ${RENAMES.length}`);
    list('db row(s) NOT covered by the mapping', unmapped, r => `${r.id}  ${r.name}`);
    list('file(s) on disk with no db row', unscanned, f => f);
    console.log('');
}

async function run() {
    const report = { planned: 0, renamed: 0, skipped: 0, failed: 0 };
    let aborted = false;

    const anchor = await Movie.findByPk(RENAMES[0].id);
    if (anchor) {
        const { dir, sep } = splitPath(anchor.path);
        await audit(dir, sep);
    } else {
        console.log(`Cannot audit: row ${RENAMES[0].id} is missing.\n`);
    }

    for (const entry of RENAMES) {
        const row = await Movie.findByPk(entry.id);

        if (!row) {
            console.log(`SKIP  ${entry.id}: no such row`);
            report.skipped++;
            continue;
        }

        if (row.name === entry.to) {
            console.log(`SKIP  ${entry.id}: already renamed`);
            report.skipped++;
            continue;
        }

        const fragments = [].concat(entry.check);
        const missing = fragments.filter(f => !row.name.toLowerCase().includes(f.toLowerCase()));

        if (missing.length) {
            console.log(`SKIP  ${entry.id}: expected ${missing.map(f => `"${f}"`).join(' + ')} in "${row.name}"`);
            report.skipped++;
            continue;
        }

        const { dir, base, sep } = splitPath(row.path);
        const oldStem = stemOf(base);
        const newPath = dir + sep + entry.to + '.mp4';

        // renameFiles.js may already have moved the file from another machine,
        // leaving only the db stale. Adopt that rather than failing on a missing
        // path - and note this needs no write access to the media volume.
        if (!fs.existsSync(row.path) && fs.existsSync(newPath)) {
            console.log(`${apply ? 'ADOPT ' : 'PLAN  '} ${entry.id}: db row -> ${entry.to}.mp4 (file already renamed)`);

            if (!apply) {
                report.planned++;
                continue;
            }

            try {
                row.set({ name: entry.to, path: newPath });
                await row.save();
                report.renamed++;
            } catch (e) {
                console.error(`FAIL  ${entry.id}: db update failed - ${e.message}`);
                report.failed++;
            }
            continue;
        }

        // Sidecars (.vtt subtitles) have to keep matching the video's stem.
        // Read this in dry run too, so the plan is a real pre-flight check.
        let siblings;
        try {
            siblings = fs.readdirSync(dir).filter(f => stemOf(f) === oldStem);
        } catch (e) {
            console.error(`FAIL  ${entry.id}: cannot read ${dir} - ${e.message}`);
            report.failed++;
            continue;
        }

        if (!siblings.length) {
            console.error(`FAIL  ${entry.id}: no file on disk at ${row.path}`);
            report.failed++;
            continue;
        }

        if (!isWritable(dir, sep)) {
            console.error(`\nABORT: ${dir} is not writable - the media volume is mounted read-only.`);
            console.error('  mount | grep LongJohn        # confirm the mount options');
            console.error('  dmesg | tail -40             # rule out I/O errors BEFORE forcing rw');
            console.error('  sudo mount -o remount,rw /media/pi/LongJohn');
            aborted = true;
            break;
        }

        console.log(`${apply ? 'RENAME' : 'PLAN  '} ${entry.id}: ${base}\n         -> ${entry.to}.mp4`);

        const sidecars = siblings.filter(f => f !== base);
        if (sidecars.length) console.log(`         +  ${sidecars.join(', ')}`);

        if (!apply) {
            report.planned++;
            continue;
        }

        const done = [];
        let broke = false;

        for (const file of siblings) {
            const ext = file.slice(oldStem.length);
            const from = dir + sep + file;
            const to = dir + sep + entry.to + ext;

            if (fs.existsSync(to)) {
                console.error(`FAIL  ${entry.id}: ${entry.to}${ext} already exists`);
                broke = true;
                break;
            }

            try {
                fs.renameSync(from, to);
                done.push([ from, to ]);
            } catch (e) {
                console.error(`FAIL  ${entry.id}: ${e.message}`);
                broke = true;
                break;
            }
        }

        if (broke) {
            done.forEach(([ from, to ]) => fs.renameSync(to, from));
            report.failed++;
            continue;
        }

        try {
            row.set({ name: entry.to, path: newPath });
            await row.save();
            report.renamed++;
        } catch (e) {
            // Disk and DB must not drift, so put the files back.
            done.forEach(([ from, to ]) => fs.renameSync(to, from));
            console.error(`FAIL  ${entry.id}: db update failed, files reverted - ${e.message}`);
            report.failed++;
        }
    }

    console.log(
        '\n' + (apply
            ? `Applied: ${report.renamed} renamed`
            : `Dry run: ${report.planned} to rename`) +
        `, ${report.skipped} skipped, ${report.failed} failed` +
        (aborted ? ' (aborted early)' : '')
    );

    if (!apply && !aborted) console.log('Re-run with --apply to write the changes.');

    await db.connection.close();
}

run().catch(async (e) => {
    console.error('LONG-JOHN ERROR:', e);
    await db.connection.close();
    process.exit(1);
});
