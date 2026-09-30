/* Cut a release: set "version" in package.json to the next number, then
 * `npm run release` at the repo root.
 *
 * Releases are plain numbers - 2, 3, 4 - and you choose them. This does not
 * bump anything. It rebuilds the frontend as a check that it compiles,
 * commits the version change, tags v<number> and pushes. The tag is what
 * starts the GitHub build of the TV app, which reads the same number out of
 * package.json for the APK's name and the version shown in its Settings.
 */
const { execSync } = require('child_process');
const fs = require('fs');

const run = (command) => execSync(command, { stdio: 'inherit' });
const out = (command) => execSync(command, { encoding: 'utf8' }).trim();

const version = String(JSON.parse(fs.readFileSync('package.json', 'utf8')).version).trim();
if (!/^\d+(\.\d+)*$/.test(version)) {
    console.error(`"version" in package.json is "${version}"; make it a number like 2.`);
    process.exit(1);
}
const tag = `v${version}`;

if (out('git branch --show-current') !== 'master') {
    console.error('Releases are cut from master.');
    process.exit(1);
}
if (out(`git tag -l ${tag}`)) {
    console.error(`${tag} already exists. Change "version" in package.json to the next number and run this again.`);
    process.exit(1);
}

// Only the version change may be uncommitted; anything else gets its own commit first.
const dirty = out('git status --porcelain').split('\n')
    .filter((line) => line && !line.startsWith('??'))
    .filter((line) => !/ (package\.json|package-lock\.json)$/.test(line));
if (dirty.length) {
    console.error('Commit or stash these first, so the release is only the release:\n  ' + dirty.join('\n  '));
    process.exit(1);
}

console.log('Building the frontend first...');
run('npm --prefix app run build');

run('git add package.json package-lock.json');
if (out('git status --porcelain package.json package-lock.json')) {
    run(`git commit -q -m "Release ${version}"`);
}
run(`git tag -a ${tag} -m "Release ${version}"`);
run('git push origin master --follow-tags');

console.log(`\nReleased ${tag}. GitHub is building LongJohn-${version}.apk; it appears here in a few minutes:`);
console.log(`  https://github.com/kevinlbatchelor/longjohn/releases/tag/${tag}`);
