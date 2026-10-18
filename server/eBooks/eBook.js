const db = require('../util/database/db');
const dl = require('../util/downloadCoverArt');

/* One row per file: a Kindle-format eBook is one file. `genre` is the shelf
   list the grid filters on, comma separated like a movie's; `info` is
   Audible's record for the book with what the file itself said tucked under
   `file` - title, authors, subjects out of the MOBI header. */
const eBookSchema = {
    name: { type: db.STRING, allowNull: false },
    path: { type: db.STRING },
    format: { type: db.STRING },
    genre: { type: db.STRING },
    info: { type: db.JSONB }
};

const EBook = db.connection.define('eBook', eBookSchema, {
    paranoid: true,
    freezeTableName: true,
    // A file is one row, and the database holds the scanner to it.
    indexes: [{ unique: true, fields: ['path'] }]
});

/* Rows that share a path are the same file indexed twice, which overlapping
   scans used to manage before the index above existed. The first row for
   each path stays, the rest go for real, covers and all. */
async function dropDuplicatePaths() {
    const [rows] = await db.connection.query(`
        delete from "eBook"
        where path is not null
          and id not in (select min(id) from "eBook" where path is not null group by path)
        returning id, path`);

    for (const row of rows) {
        await dl.removeCover(row.id + '-ebook');
        console.log('LONG-JOHN dropped duplicate ebook row', row.id, 'for', row.path);
    }
    return rows.length;
}

/* Creates the table on a database that predates it, and adds the unique
   index on an older one. The duplicates have to go before the index can
   exist, and sync would add the index first, so they go beforehand - on a
   table that is there to have them. */
EBook.ensureSchema = async () => {
    const [[{ exists }]] = await db.connection.query(`select to_regclass('"eBook"') is not null as exists`);
    if (exists) await dropDuplicatePaths();
    await EBook.sync({ alter: true });
};

EBook.dropDuplicatePaths = dropDuplicatePaths;

module.exports = EBook;
