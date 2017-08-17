myApp.factory('movieFactory', function ($http) {
    var movieFactory = {};

    movieFactory.getList = function (category, name) {
        category ? category = category : category = '%';
        name ? name = name : name = '%';
        return $http({
            method: 'GET',
            url: '../../longjohn/backEnd/movies/movieList.php?category=' + category + '&name=' + name
        });
    };

    movieFactory.getCategoryList = function () {
        return $http({
            method: 'GET',
            url: '../../longjohn/backEnd/movies/movieCategories.php'
        });
    };

    movieFactory.getOne = function (movieId) {
        return $http({
            method: 'GET',
            url: '../../longjohn/backEnd/movies/movieOne.php?movieId=' + movieId
        });
    };

    movieFactory.deleteMovie = function (id, name) {
        return $http({
            method: 'DELETE',
            url: '../../longjohn/backEnd/movies/movieDelete.php?id=' + id + '&name=' + name
        });
    };

    movieFactory.updateMovie = function (id, cat) {
        return $http({
            method: 'GET',
            url: '../../longjohn/backEnd/movies/movieEdit.php?cato=' + cat + '&id=' + id
        });
    };

    movieFactory.getInfo = function (title) {
        return $http({
                method: 'GET',
                url: 'http://www.omdbapi.com/?t='+title
            }
        )
    };

    return movieFactory
});