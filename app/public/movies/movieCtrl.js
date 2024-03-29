let chunk = function (arr, size) {
    let newArr = [];
    for (let i = 0; i < arr.length; i += size) {
        newArr.push(arr.slice(i, i + size));
    }
    return newArr;
};

myApp.controller('movieCtrl', function ($scope, movieFactory, config) {
        $scope.runOnce = true;

        $scope.getMovies = function () {
            if ($scope.runOnce) {
                $scope.runOnce = false;
            } else {
                $scope.selectAll();
            }

            movieFactory.getList($scope.searchCategory, $scope.searchName).then(function (data) {
                const movies = data.data.rows
                console.log('------->data.data', data.data);

                movies.map((movie) => {
                    movie.poster = config.baseUrl+'/cover/'+movie.id;
                })

                $scope.movieList = chunk(movies, 4);
            }).catch((error) => {
                console.log('movie list', error);
            });
        };

        $scope.deleteMovie = function (name, id) {
            let conf = confirm('Are you sure you want to delete ' + name + '?');
            if (conf) {
                movieFactory.deleteMovie(id, name);
            }
        };

        $scope.updateMovie = function (movie) {
            movieFactory.updateMovie(movie).then(function () {
                $scope.runOnce = true;
                $scope.getMovies();

            }).catch((error) => {
                console.log('movie update', error);
            });
        };
        $scope.searchCategory = 'new';
        $scope.defaultCategory = 'test';
        $scope.handleChange = function (id, cat) {
            $scope.updateMovie(id, cat);
        };

        $scope.selectAll = function () {
            if ($scope.searchCategory === 'new') {
                $scope.searchCategory = '%';
            }
        };
        $scope.getMovies();

        $scope.movieInfo = {};
        let x, y;
        $scope.getInfo = function (event, title) {
            let fixCase = _.startCase(title);
            movieFactory.getInfo(fixCase).then(function (res) {
                $scope.movieInfo.name = fixCase;
                $scope.movieInfo.plot = res.Plot;
                $scope.movieInfo.rated = res.Rated;
                $scope.movieInfo.imdb = res.imdbRating;
                x = event.screenX;
                y = event.screenY - 75;
                $scope.show = 'left:' + x + 'px;top:' + y + 'px;opacity:1; z-index:100';
            }).catch((error) => {
                console.log('movie info error', error);
            });
        };

        $scope.closeInfo = function () {
            $scope.show = $scope.show = 'left:' + x + 'px;top:' + y + 'px;opacity:o; z-index:0';
            $scope.bookInfo = {};
        };

        movieFactory.getCategoryList().then(function (data) {
            $scope.movieCategories = data.data;
        }).catch((error) => {
            console.log('movie category error', error);
        });
    }
);