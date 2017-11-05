myApp.factory('bookFactory', function ($http, config) {
    let bookFactory = {};

    bookFactory.getDetails = function (book, author) {
        return $http({
            method: 'GET',
            url: 'https://www.googleapis.com/books/v1/volumes?q=intitle:' + book + '?inauthor:' + author
        });
    };

    bookFactory.getList = function (search, alpha) {
        return $http({
            method: 'GET',
            url: config.baseUrl+'/books?search='+search+'&alpha='+alpha
        });
    };

    return bookFactory
});