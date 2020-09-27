const config = {
    omdbApiKey: '75cb371b',
    database: {
        host: '127.0.0.1',
        port: 5432,
        name: 'movies',
        username: 'postgres',
        password: 'a'
    },
    server: {
        port: 3000
    },
    movies: ['C:\\Movies', 'F:\\Movies', 'Q:\\Movies'],
    audioBooks: ['F:\\mp3s\\n\Audio Books']
};
module.exports = config;