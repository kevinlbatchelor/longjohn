myApp.factory('movieFactory', function ($http) {
    let movieFactory = {};

    movieFactory.getList = function (category, name) {
        category ? category = category : category = '%';
        name ? name = name : name = '%';
        return $http({
            method: 'GET',
            url: 'http://localhost:3000/api/v1/movie?category=' + category + '&name=' + name
        });
    };

    movieFactory.getCategoryList = function () {
        return $http({
            method: 'GET',
            url: 'http://localhost:3000/api/v1/movieCategory'
        });
    };

    // this end point dosn't return json, rather a actual streamable link
    // movieFactory.getOne = function (movieId) {
    //     return $http({
    //         method: 'GET',
    //         url: 'http://localhost:3000/api/v1/movie/' + movieId
    //     });
    // };

    movieFactory.deleteMovie = function (id) {
        return $http({
            method: 'DELETE',
            url: 'http://localhost:3000/api/v1/movie/' + id
        });
    };

    movieFactory.updateMovie = function (id, body) {
        return $http({
            method: 'PUT',
            url: 'http://localhost:3000/api/v1/movie/' + id,
            body: body
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