myApp.factory('audioBookFactory', function ($http) {
    const audioBookFactory = {};

    audioBookFactory.getPlayList = function (book) {
        return $http({
            method: 'GET',
            url: '../../longjohn/backEnd/audioBooks/audioBookPlayList.php?folder=' + book
        });
    };

    audioBookFactory.getList = function () {
        return $http({
            method: 'GET',
            url: '../../longjohn/backEnd/audioBooks/audioBookList.php'
        });
    };

    return audioBookFactory
});