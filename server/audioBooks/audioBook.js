const db = require('../util/database/db');

let movieSchema = {
    name: {type: db.STRING, allowNull: false},
    track: {type: db.STRING},
    path: {type: db.STRING},
    info: {type: db.JSONB}

};

let Movie = db.connection.define('audioBook', movieSchema, {
    paranoid: true,
    freezeTableName: true
});

module.exports = Movie;
