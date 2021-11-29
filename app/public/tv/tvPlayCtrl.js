myApp.controller('tvPlayCtrl', function ($scope, $routeParams, tvFactory, config) {
    let path = config.baseUrl + '/movie/' + $routeParams.movieId;
    let subs = config.baseUrl + '/subs/' + $routeParams.movieId;
    $scope.path = path;
    $scope.subs = subs;
});