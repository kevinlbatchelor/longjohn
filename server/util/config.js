const moviesPath = ['/media/pi/LongJohn/Movies'];
const audioBookPath = ['/media/pi/LongJohn/Audio Books'];
const tvFolderName = 'TV';
const TV = ['/media/pi/LongJohn/'+tvFolderName];
const cover = '/media/pi/LongJohn/Covers';

//windows paths
// const tvFolderName = 'TV';
// const moviesPath = ['C:\\Users\\kbatchelor\\Documents\\Movies'];
// const audioBookPath = ['C:\\Users\\kbatchelor\\Documents\\AudioBooks'];
// const TV = ['C:\\Users\\kbatchelor\\Documents\\' + tvFolderName];
// const cover = 'C:\\Users\\kbatchelor\\Documents\\Cover';

const config = {
    tvFolderName,
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
    TV: TV,
    cover: cover,
    audioBooks: audioBookPath
};
module.exports = config;