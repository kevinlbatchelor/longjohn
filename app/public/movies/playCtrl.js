myApp.controller('playCtrl', function ($scope, $routeParams, movieFactory, config) {
    let path = config.baseUrl + '/movie/' + $routeParams.movieId;
    let subs = config.baseUrl + '/subs/' + $routeParams.movieId;
    $scope.path = path;
    $scope.subs = subs;

});