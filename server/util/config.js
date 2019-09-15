const config = {
    omdbApiKey:'75cb371b',
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
    movies:['C:\\movies'],
    audioBooks:['F:\\mp3s\\Audio Books']
};

module.exports = config;