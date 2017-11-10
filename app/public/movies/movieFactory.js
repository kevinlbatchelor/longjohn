myApp.factory('movieFactory', function ($http, config) {
    let movieFactory = {};

    movieFactory.getList = function (category, name) {
        category ? category = category : category = '%';
        name ? name = name : name = '%';
        return $http({
            method: 'GET',
            url: config.baseUrl+'/movie?category=' + category + '&name=' + name
        });
    };

    movieFactory.getCategoryList = function () {
        return $http({
            method: 'GET',
            url: config.baseUrl+'/categories'
        });
    };

    movieFactory.getInfo = function (movieId) {
        return $http({
            method: 'GET',
            url: config.baseUrl+'/info/' + movieId
        });
    };

    movieFactory.deleteMovie = function (id) {
        return $http({
            method: 'DELETE',
            url: config.baseUrl+'/movie/' + id
        });
    };

    movieFactory.updateMovie = function (movie) {
        return $http({
            method: 'PUT',
            url: config.baseUrl+'/movie/' + movie.id,
            data: JSON.stringify(movie)
        });
    };

    movieFactory.getInfo = function (title) {
        return $http({
                method: 'GET',
                url: 'http://www.omdbapi.com/?t=' + title
            }
        )
    };

    return movieFactory
});