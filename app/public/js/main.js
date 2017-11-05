let myApp = angular.module('myApp', ['ngRoute', 'ngSanitize']);

myApp.config(function ($routeProvider) {
    $routeProvider.when('/', {
            templateUrl: "audioBooks/audioBooks.html",
            controller: "audioBookCtrl"
        }).when('/movies', {
            templateUrl: "movies/movies.html",
            controller: "movieCtrl"
        }).when('/moviePlay/play/:movieId', {
            templateUrl: "movies/moviePlay.html",
            controller: "playCtrl"
        }).when('/books', {
            templateUrl: "books/books.html",
            controller: "bookCtrl"
        }).when('/admin', {
            templateUrl: "admin/admin.html",
            controller: "adminCtrl"
        }).otherwise({
        template: "This doesn't exist!"
    })
});

myApp.constant('config', {
    baseUrl: 'http://192.168.1.4:3000/api/v1'
});
