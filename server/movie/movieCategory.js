const db = require('../util/database/db');
const Promise = require('bluebird');

let categories = [
    {id: 1, name: 'Scifi'},
    {id: 2, name: 'Drama'},
    {id: 3, name: 'Comedy'},
    {id: 4, name: 'Action'},
    {id: 5, name: 'TV'},
    {id: 6, name: 'Kids'}
];

let categorySchema = {
    name: {type: db.STRING, allowNull: false}
};

let Category = db.connection.define('category', categorySchema, {
    paranoid: true,
    freezeTableName: true,
    timestamps: false
});

Category.updateFunction = function () {
    return Promise.each(categories, (cat) => {
        return Category.upsert(cat).catch((err) => {
            console.log(err);
        });
    });
};

module.exports = Category;
