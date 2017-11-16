myApp.controller('playCtrl', function ($scope, $routeParams, movieFactory, config) {
    $scope.path = config.baseUrl + '/movie/' + $routeParams.movieId;
    console.log($scope.path)

    //getting one movie ie movie/234 returns the streamable link there needs to be a new end point for getting
    // the vtt file and the .edl file

    // movieFactory.getOne($routeParams.movieId).success(function (data) {
    //     console.log(data)
    //     let basePath = 'http://localhost:3000/api/v1/movie/' + data.path;
    //     data.fullPath = basePath;
    //     data.subtitle = basePath.slice(0, -4) + '.vtt';
    //     data.edl = basePath.slice(0, -4) + '.edl';
    //     $scope.movie = data;
    // });
});