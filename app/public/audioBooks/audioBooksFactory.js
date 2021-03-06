myApp.factory('audioBookFactory', function ($http, config) {
    const audioBookFactory = {};

    audioBookFactory.getPlayList = function (book) {
        return $http({
            method: 'GET',
            url: config.baseUrl + '/audioBooks/playlist?book=' + book
        });
    };

    audioBookFactory.getList = function () {
        return $http({
            method: 'GET',
            url: config.baseUrl + '/audioBooks'
        });
    };

    return audioBookFactory;
});