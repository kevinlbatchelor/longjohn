myApp.factory('tvFactory', function ($http, config) {
    let tvFactory = {};

    tvFactory.getList = function (category = 'TV', name = '%') {
        return $http({
            method: 'GET',
            url: config.baseUrl+'/movie?category=' + category + '&name=' + name
        });
    };

    tvFactory.deleteMovie = function (id) {
        return $http({
            method: 'DELETE',
            url: config.baseUrl+'/movie/' + id
        });
    };

    return tvFactory
});