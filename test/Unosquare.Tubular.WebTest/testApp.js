(function () {
    'use strict';

    angular.module('testApp.routes', ['ngRoute'])
        .config([
            '$routeProvider', '$locationProvider',
            function ($routeProvider, $locationProvider) {
                $routeProvider.
                    when('/tbGridPagerTests', {
                        templateUrl: '/test/Unosquare.Tubular.WebTest/common/tbGridPager_tests.html',
                        title: 'Tubular Grid Pager (and related) Tests'
                    })
                    .when('/tbColumnTests', {
                        templateUrl: '/test/Unosquare.Tubular.WebTest/common/tbColumn_tests.html',
                        title: 'Tubular Column Tests'
                    })
                    .when('/tbFiltersTests', {
                        templateUrl: '/test/Unosquare.Tubular.WebTest/common/tbFilters_tests.html',
                        title: 'Tubular Column Tests'
                    })
                    .when('/tbFormTests', {
                        templateUrl: '/test/Unosquare.Tubular.WebTest/common/tbForm_tests.html',
                        title: 'Tubular Form Tests'
                    })
                    .when('/tbFormSavingTests', {
                        templateUrl: '/test/Unosquare.Tubular.WebTest/common/tbFormSaving_tests.html',
                        title: 'Tubular Form Saving Tests'
                    })
                    .when('/tbGridComponentsTests', {
                        templateUrl: '/test/Unosquare.Tubular.WebTest/common/tbGridComponent_tests.html',
                        title: 'Tubular Grid Components Tests'
                    })
                    .when('/tbSingleFormTests', {
                        templateUrl: '/test/Unosquare.Tubular.WebTest/common/tbSingleForm_tests.html',
                        title: 'Tubular Single Form Tests'
                    })
                    .when('/tbEmptyFormTests', {
                        templateUrl: '/test/Unosquare.Tubular.WebTest/common/tbEmptyForm_tests.html',
                        title: 'Tubular Empty Form Tests'
                    })
                    .when('/tbFormConnErrorNoModelKeyTests', {
                        templateUrl: '/test/Unosquare.Tubular.WebTest/common/tbFormConnErrorNoModelKey_tests.html',
                        title: 'Tubular Form Loading Test'
                    })
                    .when('/tbFormConnErrorNoServerUrlTests', {
                        templateUrl: '/test/Unosquare.Tubular.WebTest/common/tbFormConnErrorNoServerUrl_tests.html',
                        title: 'Tubular Form Loading Test'
                    })
                    .when('/tbRowSelectable', {
                        templateUrl: '/test/Unosquare.Tubular.WebTest/common/tbRowSelectable.html',
                        title: 'selectedRows clearSelection isEmptySelection'
                    })
                    .otherwise({
                        redirectTo: '/'
                    });

                $locationProvider.html5Mode(true);
            }
        ])
        .controller("tbFormCtrl", function ($scope, toastr) {
            $scope.$on('tbForm_OnSuccessfulSave', function (event, data) {
                toastr.success(data || "Updated");
                alert("saved");
            });
            $scope.$on('tbForm_OnConnectionError', function () {
                $scope.Error = "No data found";
                toastr.error('No data found');
            });
        }).controller('onSaved', function ($scope) {
            $scope.$on('tbForm_OnSuccessfulSave', function () {
                $scope.textSave = "Saved";
            });

        }).controller('rwController', [
            '$scope', 'localStorageService',
            function ($scope, localStorageService) {
                $scope.selectRows = function () {
                    var rows = localStorageService.get('sampleshap1_rows');
                    $scope.rows = rows.length;
                };
            }
        ]);

    angular.module('app', [
        'tubular',
        'toastr',
        'testApp.routes'
    ]);
})();