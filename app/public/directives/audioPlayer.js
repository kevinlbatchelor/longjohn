myApp.directive('audioPlayer', function ($q, $window) {

    return {
        restrict: 'E',
        scope: {
            tracks: '=',
            book: '='
        },
        template: '<div ng-show="book"><audio id="audio" ng-src="{{path}}" controls autoplay></audio>Track: {{track+1}}<div class="remove-bookmark" ng-click="clearBookMarks()">Clear Bookmark</div></div>',

        link: function ($scope) {
            $scope.$watch('book', function(){
                $scope.playIt();
            });

            $scope.track = 0;
            var media = document.getElementById('audio');
            $scope.check = {};

            $scope.clearBookMarks = function () {
                if (typeof(Storage) !== "undefined"){
                    localStorage.removeItem($scope.book.name);
                    $window.location.reload();
                } else {
                    alert("Your browser does not support web storage.");
                }
            };

            var saveMediaData = function (data) {
                if (typeof(Storage) !== "undefined") {
                    var mediaAbout = {'book': $scope.book, 'time': data, 'path': $scope.path, track: $scope.track};
                    localStorage.setItem($scope.book.name, JSON.stringify(mediaAbout));
                } else {
                    alert("Your browser does not support web storage.");
                }
            };

            var checkForBookmark = function () {
                //media.removeEventListener('canplay', checkForBookmark);
                var lastHeard = JSON.parse(localStorage.getItem($scope.book.name));
                if (lastHeard != null && angular.isDefined(lastHeard.track)) {
                    $scope.track = lastHeard.track;
                    media.currentTime = lastHeard.time;
                }
            };

            var listenForPause = function () {
                media.addEventListener('pause', function () {
                    saveMediaData(media.currentTime);
                });
            };

            var nextTrack = function () {
                $scope.track++;
                $scope.path = "../../" + $scope.tracks[$scope.track].path;
            };

            var ii = 0;

            function getMedia() {
                listenForPause();
                return $q(function (resolve, reject) {
                    media.addEventListener('ended', function () {
                        if (ii > 1) {
                            nextTrack();
                            $scope.$digest();
                            media.load();
                            media.play();
                        }
                        ii++;
                        resolve("The song is over");
                    });
                    media.addEventListener('error', function (e) {
                        reject(e);
                    });
                });
            }

            $scope.playIt = function(){
                if (ii === 0) {
                    $scope.$watch('tracks', function () {
                        if (_.isArray($scope.tracks)) {
                            checkForBookmark();
                            $scope.path = "../../" + $scope.tracks[$scope.track].path;
                            getMedia().then(function () {
                                nextTrack();
                                media.load();
                                media.play();

                            }, function (error) {
                                console.log(error);
                            });
                        }
                    }, true);
                    ii++;
                }
            }
        }
    }
});