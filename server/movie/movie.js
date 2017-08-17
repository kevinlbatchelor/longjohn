const db = require('../util/database/db');

let movieSchema = {
    name: {type: db.STRING, allowNull: false},
    description: {type: db.STRING},
    path: {type: db.STRING},
    rating: {type: db.STRING},
    genre: {type: db.STRING, default: 'ALL'}
};

let Movie = db.connection.define('movie', movieSchema, {
    paranoid: true,
    freezeTableName: true
});

module.exports = Movie;
