const moviesPath = ['/media/pi/LongJohn/Movies'];
const audioBookPath = ['/media/pi/LongJohn/Audio Books'];

//windows paths
// const moviePath = ['C:\\Movies', 'F:\\Movies', 'Q:\\Movies']
// const audioBookPath = ['F:\\mp3s\\Audio Books']

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
    movies: moviesPath,
    audioBooks: audioBookPath
};
module.exports = config;