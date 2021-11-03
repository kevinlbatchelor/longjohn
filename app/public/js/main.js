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
        // this is need for loading audio and video files
        // You needed to add a port forwarding rule for 80 for front end requests and for port 3000 for request from the server to the back end
        'http://localhost:3000*/**',
        'http://nodeServerIp:3000*/**',
        'http://myhomeip:6543*/**',
        '*'
    ])
});

myApp.constant('config', {
    baseUrl: 'http://localhost:3000/api/v1'
});
