const db = require('../util/database/db');

/* One row per track. What the book is - author, narrator, series, categories,
   cover - is the same on every one of its rows, the way a TV show's details
   ride on each episode's movie row. `genre` is the shelf list the grid
   filters on, comma separated like a movie's; `info` is Audible's record,
   like a movie's imdb blob. */
const audioBookSchema = {
    name: { type: db.STRING, allowNull: false },
    track: { type: db.STRING },
    path: { type: db.STRING },
    genre: { type: db.STRING },
    info: { type: db.JSONB }
};

const AudioBook = db.connection.define('audioBook', audioBookSchema, {
    paranoid: true,
    freezeTableName: true
});

/* The genre column arrived after the table was first created. sync with
   alter adds what is missing and leaves the rows alone; the force sync in
   updateDatabase.js is the one that starts over. */
AudioBook.ensureSchema = () => AudioBook.sync({ alter: true });

module.exports = AudioBook;
