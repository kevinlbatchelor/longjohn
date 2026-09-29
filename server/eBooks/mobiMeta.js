/* What a Kindle file says about itself -------------------------------------------
 * MOBI, PRC, AZW and AZW3 files all start with a Palm database header, and
 * record 0 carries a MOBI header and, nearly always, an EXTH block of tagged
 * metadata: author, title, subjects, ISBN, ASIN. Reading it costs one small
 * read and gives a far better search than the file name ever could.
 *
 * Returns { title, authors, subjects, isbn, asin, publisher, publishDate,
 * language } with whatever was present, or null for a file that is not one.
 */
const fs = require('fs');

const EXTH_FIELDS = {
    100: 'author',
    101: 'publisher',
    104: 'isbn',
    105: 'subject',
    106: 'publishDate',
    113: 'asin',
    503: 'title',
    524: 'language'
};
const LISTS = new Set(['author', 'subject']);

const clean = (text) => text.replace(/\0/g, '').trim();

const readMobiMeta = async function (filePath) {
    const fd = await fs.promises.open(filePath, 'r');
    try {
        // Palm database header: type and creator at 60, record count at 76,
        // then eight bytes per record, the offset first.
        const head = Buffer.alloc(94);
        await fd.read(head, 0, head.length, 0);
        if (head.toString('latin1', 60, 68) !== 'BOOKMOBI') return null;
        if (head.readUInt16BE(76) < 2) return null;

        const start = head.readUInt32BE(78);
        const end = head.readUInt32BE(86);
        const length = end - start;
        if (length <= 0 || length > 4 * 1024 * 1024) return null;

        const rec = Buffer.alloc(length);
        await fd.read(rec, 0, length, start);
        if (rec.toString('latin1', 16, 20) !== 'MOBI') return null;

        const headerLength = rec.readUInt32BE(20);
        const encoding = rec.readUInt32BE(28) === 65001 ? 'utf8' : 'latin1';
        const fullNameOffset = rec.readUInt32BE(84);
        const fullNameLength = rec.readUInt32BE(88);
        const exthFlags = headerLength >= 116 ? rec.readUInt32BE(128) : 0;

        const meta = {};
        if (exthFlags & 0x40) {
            let p = 16 + headerLength;
            if (rec.toString('latin1', p, p + 4) === 'EXTH') {
                const count = rec.readUInt32BE(p + 8);
                p += 12;
                for (let i = 0; i < count && p + 8 <= rec.length; i++) {
                    const type = rec.readUInt32BE(p);
                    const size = rec.readUInt32BE(p + 4);
                    if (size < 8 || p + size > rec.length) break;

                    const field = EXTH_FIELDS[type];
                    if (field) {
                        const value = clean(rec.toString(encoding, p + 8, p + size));
                        if (value) {
                            if (LISTS.has(field)) (meta[field] = meta[field] || []).push(value);
                            else if (!meta[field]) meta[field] = value;
                        }
                    }
                    p += size;
                }
            }
        }

        // The title lives in EXTH on newer files and only in the header's
        // full-name field on older ones.
        if (!meta.title && fullNameOffset && fullNameLength && fullNameOffset + fullNameLength <= rec.length) {
            meta.title = clean(rec.toString(encoding, fullNameOffset, fullNameOffset + fullNameLength));
        }

        return {
            title: meta.title || '',
            authors: meta.author || [],
            subjects: meta.subject || [],
            isbn: meta.isbn,
            asin: meta.asin,
            publisher: meta.publisher,
            publishDate: meta.publishDate,
            language: meta.language
        };
    } finally {
        await fd.close();
    }
};

module.exports = { readMobiMeta };
