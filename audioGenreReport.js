/* How the audiobook library is shelved ------------------------------------------
 * Writes every book with the Audible record it matched and the categories it
 * sits under, then a count per category and the books Audible had nothing
 * convincing on - the ones worth a hand-typed category, or a folder rename.
 *
 *   node audioGenreReport.js                 report on what the database holds
 *   node audioGenreReport.js --lookup        also ask Audible about books with
 *                                            no record yet, saving nothing
 *   node audioGenreReport.js --out path.txt  write somewhere other than
 *                                            audioGenreReport.txt here
 *
 * The full report goes to the file and only the counts are printed. Run from
 * the repo root on the machine with the database. A scan (Find Audio in
 * Admin) is what actually stores the records; this only reads them.
 */
const fs = require('fs');
const path = require('path');
const audioBook = require('./server/audioBooks/audioBook');
const audible = require('./server/audioBooks/audible');

const args = process.argv.slice(2);
const lookup = args.includes('--lookup');
const outIndex = args.indexOf('--out');
const outFile = path.resolve(outIndex !== -1 && args[outIndex + 1] ? args[outIndex + 1] : 'audioGenreReport.txt');

const lines = [];
const out = (line) => lines.push(line === undefined ? '' : line);

const splitGenre = (genre) => String(genre || '').split(',').map((s) => s.trim()).filter(Boolean);

const describe = (record) => {
    if (!record || !record.title) return '';
    const series = record.series && record.series.name
        ? ` (${record.series.name}${record.series.position ? ' #' + record.series.position : ''})`
        : '';
    return record.title + (record.authors.length ? ' - ' + record.authors.join(', ') : '') + series;
};

(async () => {
    await audioBook.ensureSchema();
    const rows = await audioBook.findAll({ raw: true, attributes: ['name', 'genre', 'info'], order: [['name']] });

    // One entry per book; the first row's record stands for all of them.
    const books = new Map();
    rows.forEach((row) => {
        if (books.has(row.name)) return;
        const info = row.info || {};
        books.set(row.name, {
            record: info.asin ? info : null,
            categories: splitGenre(row.genre),
            preview: null
        });
    });

    if (lookup) {
        for (const [name, book] of books) {
            if (book.record) continue;
            try {
                book.preview = await audible.lookup(name);
            } catch (e) {
                console.error('lookup failed for', name, '-', e.message);
            }
        }
    }

    const perCategory = new Map();
    const unmatched = [];

    const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
    out('Audiobook shelves - ' + stamp + (lookup ? ' (with Audible lookups)' : ''));
    out();

    for (const [name, book] of books) {
        const record = book.record || book.preview;
        const categories = book.categories.length ? book.categories : (book.preview ? book.preview.categories : []);
        categories.forEach((c) => perCategory.set(c, (perCategory.get(c) || 0) + 1));
        if (!record) unmatched.push(name);

        out(name);
        if (record) out('    audible:    ' + describe(record) + (book.preview ? ' (not saved)' : ''));
        else out('    audible:    (nothing convincing)');
        out('    categories: ' + (categories.length ? categories.join(', ') : '(none)'));
    }

    const summary = ['--- books per category (' + books.size + ' books)'];
    Array.from(perCategory.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .forEach(([category, count]) => summary.push(String(count).padStart(5) + '  ' + category));
    summary.push('--- not matched: ' + unmatched.length);

    out();
    summary.forEach(out);
    out();
    out('--- not matched (' + unmatched.length + ')');
    unmatched.forEach((n) => out('    ' + n));
    if (!lookup && unmatched.length) out('    run with --lookup to see what Audible would say about these');

    fs.writeFileSync(outFile, lines.join('\n') + '\n');

    console.log('');
    summary.forEach((l) => console.log(l));
    console.log('');
    console.log('full report written to ' + outFile);
    process.exit(0);
})().catch((e) => {
    console.error(e);
    process.exit(1);
});
