myApp.controller('adminCtrl', function ($scope, adminFactory) {
console.log('loaded')
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
        console.log('scanning clicked')
        showScanning().then(function () {
            adminFactory.findMovies().success(function (data) {
                $scope.result = data;
                $scope.scanning = false;
            })
        })
    };

    $scope.findEBooks = function () {
        showScanning().then(function () {
            adminFactory.findEBooks().success(function (data) {
                $scope.result = data;
                $scope.scanning = false;
            })
        })
    };

    $scope.findAudio = function () {
        showScanning().then(function () {
            adminFactory.findAudio().success(function (data) {
                $scope.result = data;
                $scope.scanning = false;
            })
        });
    }
});