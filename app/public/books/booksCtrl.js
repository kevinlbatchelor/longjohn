myApp.controller('bookCtrl', function ($scope, bookFactory, $routeParams) {
    $scope.getBooks = function () {
        bookFactory.getList($scope.search, $scope.alpha.val).success(function (data) {
            $scope.bookList = data;
            $scope.bookList.map(function (d) {
                d.imagePath = '../pics/' + d.name + '.jpg';
                return d;
            });

            let chunk = function (arr, size) {
                let newArr = [];
                for (let i = 0; i < arr.length; i += size) {
                    newArr.push(arr.slice(i, i + size));
                }
                return newArr;
            };

            $scope.bookList = chunk($scope.bookList, 4);
        });
    };

    $scope.search = '';

    $scope.alphabet = [
        {name: 'All', val: '[:alnum:]'},
        {name: 'A', val: 'a'},
        {name: 'B', val: 'b'},
        {name: 'C', val: 'c'},
        {name: 'D', val: 'd'},
        {name: 'E', val: 'e'},
        {name: 'F', val: 'f'},
        {name: 'G', val: 'g'},
        {name: 'H', val: 'h'},
        {name: 'I', val: 'i'},
        {name: 'J', val: 'j'},
        {name: 'K', val: 'k'},
        {name: 'L', val: 'l'},
        {name: 'M', val: 'm'},
        {name: 'N', val: 'n'},
        {name: 'O', val: 'o'},
        {name: 'P', val: 'p'},
        {name: 'Q', val: 'q'},
        {name: 'R', val: 'r'},
        {name: 'S', val: 's'},
        {name: 'T', val: 't'},
        {name: 'U', val: 'u'},
        {name: 'V', val: 'v'},
        {name: 'W', val: 'w'},
        {name: 'X', val: 'x'},
        {name: 'Y', val: 'y'},
        {name: 'Z', val: 'z'}
    ];

    $scope.alpha = $scope.alphabet[0];

    $scope.bookInfo = {};
    let x, y;
    $scope.getInfo = function (event, book) {

        $scope.author = $routeParams.author;
        $scope.title = $routeParams.title;

        bookFactory.getDetails(book.title, book.author).success(function (data) {
            $scope.details = data.items;
            x = event.screenX;
            y = event.screenY - 75;
            $scope.show = 'left:' + x + 'px;top:' + y + 'px;opacity:1; z-index:100';
        });
    };

    $scope.closeInfo = function () {
        $scope.show = $scope.show = 'left:' + x + 'px;top:' + y + 'px;opacity:o; z-index:0';
        $scope.bookInfo = {};
    };
});