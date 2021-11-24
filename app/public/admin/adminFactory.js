myApp.factory('adminFactory', function ($http, config) {
    let adminFactory = {};

    adminFactory.findTV = function () {
        return $http({
            method: 'GET',
            url: config.baseUrl + '/scan/TV'
        });
    };

    adminFactory.findMovies = function () {
        return $http({
            method: 'GET',
            url: config.baseUrl + '/scan'
        });
    };

    adminFactory.findAudio = function () {
        return $http({
            method: 'GET',
            url: config.baseUrl + '/scan/audio'
        });
    };

    adminFactory.findEBooks = function () {
        return $http({
            method: 'GET',
            url: config.baseUrl + '/bookScanner'
        });
    };

    return adminFactory;
});