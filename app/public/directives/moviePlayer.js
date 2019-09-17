myApp.directive('videoPlayer', function ($compile, $http, $sce) {

    return {
        restrict: 'E',
        scope: {
            path: '=',
            subs: '=',
            edl: '=',
            editing: '='
        },

        link: function ($scope, $element) {
            let currentTime = 0;
            let cutList = [];
            let start = 0;
            let createdCutList = [];
            $scope.cutting = false;

            $scope.$watch('edl', function () {
                if ($scope.edl) {
                    $http({method: 'GET', url: $scope.edl}).then(function (edlFile) {
                        cutList = edlFile.data;

                        if (cutList.length > 0) {
                            let media = document.getElementById('video');

                            media.addEventListener('timeupdate', function (e) {
                                currentTime = Math.round(e.target.currentTime);
                                let cut = _.find(cutList, {start: currentTime});
                                if (cut) {
                                    media.currentTime = currentTime + cut.skip;
                                }
                            });
                        }
                    });
                }
            });

            $scope.$watch('editing', function () {
                $scope.editCtrls = $scope.editing;
            });

            $scope.trustSrc = function (src) {
                return $sce.trustAsResourceUrl(src);
            };

            let video = angular.element('<div class="video-player"></div>');
            video.append(`<video id="video" width="100%" preload="none" ng-src="{{trustSrc(path)}}" autoplay controls type="video/mp4" crossorigin="anonymous">
                            <!--<source ng-src="{{trustSrc(path)}}" autoplay controls type="video/mp4">-->
                            <!--angular screws source tags, moving src to video tag fixes it-->
                            <track label="English" kind="subtitles" srclang="en" ng-src="{{trustSrc(subs)}}" crossorigin="anonymous" default>
                        </video>`);
            $compile(video)($scope);
            $element.append(video);


            let startCut = angular.element(`
                <div ng-if="editCtrls">
                        <button ng-if="!cutting" ng-click="startRecording()">Start Cut</button>
                        <button ng-if="cutting" ng-click="finnishRecording()" >Stop Cut</button>
                </div>`);
            $compile(startCut)($scope);
            $element.append(startCut);

            $scope.startRecording = function () {
                let cutPoint = {};
                start = currentTime;
                cutPoint.start = start;
                createdCutList.push(cutPoint);
                $scope.cutting = true;
            };

            $scope.finnishRecording = function () {
                let cutPoint = _.find(createdCutList, {'start': start});
                cutPoint.skip = currentTime - cutPoint.start;
                start = null;
                $scope.cutting = false;

                console.log(JSON.stringify(createdCutList));
                start = 0;
            }
        }
    }
});