myApp.controller('audioBookCtrl', function ($scope, audioBookFactory) {
    $scope.getBook = function (book) {
        audioBookFactory.getPlayList(book).success(function (data) {
            $scope.tracks = data;
        });
    };

    audioBookFactory.getList().success(function (data) {
        $scope.audioBookList = data.rows;
    });
});