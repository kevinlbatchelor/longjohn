myApp.controller('playCtrl', function ($scope, $routeParams, movieFactory) {
    $scope.path = $routeParams.path;

    movieFactory.getOne($routeParams.movieId).success(function (data) {
        data.fullPath = 'http://192.168.1.146/longjohn/'+data.realpath;
        data.subtitle = 'http://192.168.1.146/longjohn/'+data.realpath.slice(0, -4)+'.vtt';
        data.edl = 'http://192.168.1.146/longjohn/'+data.realpath.slice(0, -4)+'.edl';
        $scope.movie = data;
    });
});