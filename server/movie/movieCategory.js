const db = require('../util/database/db');

let categorySchema = {
    name: {type: db.STRING, allowNull: false}
};

let Category = db.connection.define('category', categorySchema, {
    paranoid: true,
    freezeTableName: true
});

module.exports = Category;
