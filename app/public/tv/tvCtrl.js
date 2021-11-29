myApp.controller('tvCtrl', function ($scope, tvFactory, config) {
        $scope.runOnce = true;

        $scope.getTv = function () {
            if ($scope.runOnce) {
                $scope.runOnce = false;
            } else {
                $scope.selectAll();
            }

            tvFactory.getList().then(function (data) {
                const shows = data.data.rows

                shows.map((movie) => {
                    movie.poster = config.baseUrl+'/cover/'+movie.id;
                })

                $scope.tvList = chunk(shows, 4);
            }).catch((error) => {
                console.log('movie list', error);
            });
        };

        $scope.getTv();

        $scope.deleteMovie = function (name, id) {
            let conf = confirm('Are you sure you want to delete ' + name + '?');
            if (conf) {
                tvFactory.deleteMovie(id, name);
            }
        };
    }
);