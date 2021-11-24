myApp.controller('adminCtrl', function ($scope, adminFactory) {
    $scope.result = [];
    $scope.scanning = false;
    let showScanning = function () {
        return new Promise(
            function (resolve) {
                $scope.result = [];
                $scope.scanning = true;
                resolve();
            }
        );
    };

    $scope.findMovies = function () {
        showScanning().then(function () {
            adminFactory.findMovies().then(function (data) {
                $scope.result = data.data;
                $scope.scanning = false;
            });
        }).catch((error) => {
            console.log('scanning', error);
        });
    };

    $scope.findTV = function () {
        showScanning().then(function () {
            adminFactory.findTV().then(function (data) {
                $scope.result = data.data;
                $scope.scanning = false;
            });
        }).catch((error) => {
            console.log('scanning', error);
        });
    };

    $scope.findEBooks = function () {
        showScanning().then(function () {
            adminFactory.findEBooks().then(function (data) {
                $scope.result = data.data;
                $scope.scanning = false;
            });
        }).catch((error) => {
            console.log('scanning', error);
        });
    };

    $scope.findAudio = function () {
        showScanning().then(function () {
            adminFactory.findAudio().then(function (data) {
                $scope.result = data.data;
                $scope.scanning = false;
            });
        }).catch((error) => {
            console.log('scanning', error);
        });
    };
});