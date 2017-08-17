myApp.controller('movieCtrl', function ($scope, movieFactory) {
        $scope.runOnce = true;
        $scope.getMovies = function () {
            if ($scope.runOnce) {
                $scope.runOnce = false;
            } else {
                $scope.selectAll();
            }

            movieFactory.getList($scope.searchCategory, $scope.searchName).success(function (data) {
                $scope.movieList = data;
                $scope.movieList.map(function (d) {
                    d.imagePath = '../pics/' + d.name + '.jpg';
                    let isAvi = d.realpath.substr(d.realpath.length - 3);
                    if(isAvi === 'avi' || isAvi === 'mkv'){
                        d.isAvi = true;
                    }
                    return d;
                });

                let chunk = function (arr, size) {
                    let newArr = [];
                    for (let i = 0; i < arr.length; i += size) {
                        newArr.push(arr.slice(i, i + size));
                    }
                    return newArr;
                };

                $scope.movieList = chunk($scope.movieList, 4);
            });
        };

        $scope.deleteMovie = function (name, id) {
            let conf = confirm('Are you sure you want to delete ' + name + '?');
            if (conf) {
                movieFactory.deleteMovie(id, name);
            }
        };

        $scope.updateMovie = function (item, cat) {
            movieFactory.updateMovie(item.id, cat).success(function () {
                $scope.runOnce = true;
                $scope.getMovies();

            })
        };
        $scope.searchCategory = 'new';
        $scope.defaultCategory = 'test';
        $scope.handleChange = function (id, cat) {
            $scope.updateMovie(id, cat)
        };

        $scope.selectAll = function () {
            if ($scope.searchCategory === 'new') {
                $scope.searchCategory = '%';
            }
        };
        $scope.getMovies();

        $scope.movieInfo = {};
        let x,y;
        $scope.getInfo = function (event, title) {
            let fixCase = _.startCase(title);
            movieFactory.getInfo(fixCase).success(function (res) {
                $scope.movieInfo.name = fixCase;
                $scope.movieInfo.plot = res.Plot;
                $scope.movieInfo.rated = res.Rated;
                $scope.movieInfo.imdb = res.imdbRating;
                x = event.screenX;
                y = event.screenY - 75;
                $scope.show = 'left:' + x + 'px;top:' + y + 'px;opacity:1; z-index:100';
            })
        };

        $scope.closeInfo = function () {
            $scope.show = $scope.show = 'left:' + x + 'px;top:' + y + 'px;opacity:o; z-index:0';
            $scope.bookInfo = {};
        };

        movieFactory.getCategoryList().success(function (data) {
            $scope.movieCategories = data;
        });
    }
);