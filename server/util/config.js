const moviesPath = ['/media/pi/LongJohn/Movies'];
const audioBookPath = ['/media/pi/LongJohn/Audio Books'];
const tvFolderName = 'TV';
const TV = ['/media/pi/LongJohn/'+tvFolderName];
const cover = '/media/pi/LongJohn/Covers';

//windows paths
// const tvFolderName = 'TV';
// const moviesPath = ['C:\\Users\\windowsUserName\\Documents\\Movies'];
// const audioBookPath = ['C:\\Users\\windowsUserName\\Documents\\AudioBooks'];
// const TV = ['C:\\Users\\windowsUserName\\Documents\\' + tvFolderName];
// const cover = 'C:\\Users\\windowsUserName\\Documents\\Cover';

const config = {
    omdbApiKey:'',
    goog:'',
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