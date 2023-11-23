myApp.controller('tvCtrl', function ($scope, tvFactory, config) {
        $scope.runOnce = true;
        $scope.episodes = 'hide-episodes';
        $scope.orgList = [];

        $scope.getTv = function () {
            if ($scope.runOnce) {
                $scope.runOnce = false;
            } else {
                $scope.selectAll();
            }

            tvFactory.getList().then(function (data) {
                const shows = data.data.rows;
                $scope.orgList = shows;

                shows.map((movie) => {
                    movie.poster = config.baseUrl + '/cover/' + movie.name;
                    movie.style = 'height:0;display:none;overflow:hidden;';
                });

                $scope.tvList = chunk(shows, 4);
            }).catch((error) => {
                console.log('movie list', error);
            });
        };

        $scope.showEpisodes = function (name) {
            const hiddenStyle = 'height:0;display:none;overflow:hidden;';
            $scope.orgList.map((movie) => {
                if (movie.name === name && movie.style === hiddenStyle) {
                    movie.style = '';
                } else {
                    movie.style = hiddenStyle;
                }
            });

            $scope.tvList = chunk($scope.orgList, 4);
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