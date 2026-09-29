const db = require('../util/database/db');

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
    freezeTableName: true
});

// Creates the table on a database that predates it; leaves rows alone.
EBook.ensureSchema = () => EBook.sync({ alter: true });

module.exports = EBook;
