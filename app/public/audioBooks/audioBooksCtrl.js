myApp.controller('audioBookCtrl', function ($scope, audioBookFactory) {
    $scope.getBook = function (book) {
        audioBookFactory.getPlayList(book).then(function (data) {
            $scope.tracks = data.data;
        }).catch((error) => {
            console.log('get book error', error);
        });
    };

    audioBookFactory.getList().then(function (data) {
        $scope.audioBookList = data.data.rows;
    }).catch((error) => {
        console.log('get book list error', error);
    });
});