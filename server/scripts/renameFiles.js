/*
 * Disk-only renamer: applies the SxxEyy mapping to files in a show folder.
 *
 * For when the media is attached to a machine that cannot reach the database -
 * e.g. the drive pulled out of the Pi and plugged into a Windows box. It does
 * NOT touch movie rows, so their `path` values go stale until renameEpisodes.js
 * is run on the server, which adopts files already renamed here.
 *
 *   node server/scripts/renameFiles.js "D:\TV\Avatar"
 *   node server/scripts/renameFiles.js "D:\TV\Avatar" --apply
 */

const fs = require('fs');
const path = require('path');
const AVATAR = require('./episodeMap');

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const dir = args.find(a => !a.startsWith('--'));

if (!dir) {
    console.error('Usage: node renameFiles.js <folder> [--apply]');
    process.exit(1);
}

function stemOf(base) {
    const dot = base.lastIndexOf('.');
    return dot === -1 ? base : base.slice(0, dot);
}

const all = fs.readdirSync(dir);
const videos = all.filter(f => f.toLowerCase().endsWith('.mp4'));
const targets = new Set(AVATAR.map(e => e.to + '.mp4'));

const plan = [];
const problems = [];
let done = 0;

for (const entry of AVATAR) {
    const target = entry.to + '.mp4';

    if (videos.includes(target)) {
        done++;
        continue;
    }

    const fragments = [].concat(entry.check);
    // Never match a file that is already someone's target, or the mapping could
    // consume a previously renamed episode.
    const matches = videos.filter(f =>
        !targets.has(f) &&
        fragments.every(fr => f.toLowerCase().includes(fr.toLowerCase()))
    );

    if (matches.length === 0) {
        problems.push(`no file matches ${fragments.map(f => `"${f}"`).join(' + ')}  -> ${target}`);
        continue;
    }

    if (matches.length > 1) {
        problems.push(`${matches.length} files match ${fragments.map(f => `"${f}"`).join(' + ')}:\n      ${matches.join('\n      ')}`);
        continue;
    }

    plan.push({ from: matches[0], to: target });
}

// A file claimed by two entries would rename once and then vanish from under the
// second, so catch it before touching the disk.
const claimed = new Map();
plan.forEach(p => claimed.set(p.from, (claimed.get(p.from) || 0) + 1));
claimed.forEach((n, f) => {
    if (n > 1) problems.push(`${n} mapping entries claim the same file: ${f}`);
});

if (done) console.log(`${done} already renamed\n`);

plan.forEach(p => console.log(`${apply ? 'RENAME' : 'PLAN  '} ${p.from}\n       -> ${p.to}`));

if (problems.length) {
    console.error(`\n${problems.length} PROBLEM(S):`);
    problems.forEach(p => console.error(`  - ${p}`));
    console.error('\nNothing renamed. Resolve the above first.');
    process.exit(1);
}

if (!apply) {
    console.log(`\nDry run: ${plan.length} to rename, ${done} already done.`);
    console.log('Re-run with --apply to write the changes.');
    process.exit(0);
}

let renamed = 0;

for (const p of plan) {
    const oldStem = stemOf(p.from);
    const newStem = stemOf(p.to);
    // Sidecars (.vtt) have to keep matching the video's stem.
    const group = all.filter(f => stemOf(f) === oldStem);
    const moved = [];

    try {
        for (const file of group) {
            const ext = file.slice(oldStem.length);
            const from = path.join(dir, file);
            const to = path.join(dir, newStem + ext);

            if (fs.existsSync(to)) throw new Error(`${newStem}${ext} already exists`);

            fs.renameSync(from, to);
            moved.push([ from, to ]);
        }
        renamed++;
    } catch (e) {
        moved.forEach(([ from, to ]) => fs.renameSync(to, from));
        console.error(`FAIL  ${p.from}: ${e.message}`);
    }
}

console.log(`\nApplied: ${renamed} renamed, ${done} already done.`);
