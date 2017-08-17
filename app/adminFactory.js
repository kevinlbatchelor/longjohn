myApp.factory('adminFactory', function ($http) {
    var adminFactory = {};

    adminFactory.findMovies = function () {
        return $http({
            method: 'GET',
            url: '../../longjohn/backEnd/scanners/movieFinder.php'
        });
    };

    adminFactory.findAudio = function () {
        return $http({
            method: 'GET',
            url: '../../longjohn/backEnd/scanners/mp3Finder.php'
        });
    };

    adminFactory.findEBooks = function () {
        return $http({
            method: 'GET',
            url: '../../longjohn/backEnd/scanners/ebookFinder.php'
        });
    };

    return adminFactory
});