let myApp = angular.module('myApp', ['ngRoute', 'ngSanitize']);

myApp.config(function ($routeProvider, $sceProvider, $sceDelegateProvider) {
    $routeProvider.when('/', {
        templateUrl: 'audioBooks/audioBooks.html',
        controller: 'audioBookCtrl'
    }).when('/movies', {
        templateUrl: 'movies/movies.html',
        controller: 'movieCtrl'
    }).when('/moviePlay/play/:movieId', {
        templateUrl: 'movies/moviePlay.html',
        controller: 'playCtrl'
    }).when('/books', {
        templateUrl: 'books/books.html',
        controller: 'bookCtrl'
    }).when('/admin', {
        templateUrl: 'admin/admin.html',
        controller: 'adminCtrl'
    }).otherwise({
        templateUrl: 'movies/movies.html',
        controller: 'movieCtrl'
    });
    // $sceProvider.enabled(false);
    $sceDelegateProvider.resourceUrlWhitelist([
        // Allow same origin resource loads.
        'self',
        // Allow loading from our assets domain.  Notice the difference between * and **.
        'http://localhost:3000*/**',
        'http://192.168.1.34:3000*/**'
    ]);
});

myApp.constant('config', {
    baseUrl: 'http://192.168.1.34:3000/api/v1'
});
