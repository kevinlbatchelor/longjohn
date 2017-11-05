myApp.factory('bookFactory', function ($http) {
    var bookFactory = {};

    bookFactory.getDetails = function (book, author) {
        return $http({
            method: 'GET',
            url: 'https://www.googleapis.com/books/v1/volumes?q=intitle:' + book + '?inauthor:' + author
        });
    };

    bookFactory.getList = function (search, alpha) {
        return $http({
            method: 'GET',
            url: '../../longjohn/backEnd/books/bookList.php?search='+search+'&alpha='+alpha
        });
    };

    return bookFactory
});