﻿(function(angular) {
    'use strict';

    angular.module('app.routes', ['ngRoute'])
        .config([
            '$routeProvider', '$locationProvider', function($routeProvider, $locationProvider) {
                $routeProvider.
                    when('/', {
                        templateUrl: '/ui/app/common/view.html',
                        title: 'A Sample Data Grid!'
                    }).when('/format', {
                        templateUrl: '/ui/app/common/viewformat.html',
                        title: 'Charts and grid'
                    }).when('/form/:param', {
                        templateUrl: '/ui/app/common/form.html',
                        title: 'This is a form!'
                    }).when('/login', {
                        templateUrl: '/ui/app/common/login.html',
                        title: 'Login'
                    }).when('/new/', {
                        templateUrl: '/ui/app/common/formnew.html',
                        title: 'Add a new ORDER NOW!'
                    }).otherwise({
                        redirectTo: '/'
                    });

                $locationProvider.html5Mode(true);
            }
        ]);

    angular.module('app.controllers', ['tubular.services'])
        .controller('titleController', [
            '$scope', '$route', function ($scope, $route) {
                var me = this;
                me.content = "Home";

                $scope.$on('$routeChangeSuccess', function () {
                    me.content = $route.current.title;
                });
            }
        ]).controller('loginCtrl', [
            '$scope', '$location', 'tubularHttp', 'toastr', function($scope, $location, tubularHttp, toastr) {
                $scope.loading = false;
                tubularHttp.tokenUrl = 'http://tubular.azurewebsites.net/token';

                $scope.submitForm = function() {
                    $scope.loading = true;

                    tubularHttp.authenticate($scope.username, $scope.password,
                        function() {
                            $location.path("/expirationDate");
                        },
                        function(error) {
                            $scope.loading = false;
                            toastr.error(error);
                        });
                };
            }
        ]).controller('i18nCtrl', [
            '$scope', 'tubularTranslate', 'toastr', function ($scope, tubularTranslate, toastr) {
                $scope.toggle = function () {
                    tubularTranslate.setLanguage(tubularTranslate.currentLanguage === 'en' ? 'es' : 'en');
                    toastr.info('New language: ' + tubularTranslate.currentLanguage);
                };
            }
        ])
        .controller('tubularSampleCtrl', [
            '$scope', '$location', 'toastr', function ($scope, $location, toastr) {
                var me = this;
                me.onTableController = function () {
                    console.log('On Before Get Data Event: fired.');
                };

                me.defaultDate = new Date();

                me.ColumnName = "Date";
                me.Filter = "Oxxo";

                // Grid Events
                $scope.$on('tbGrid_OnBeforeRequest', function (event, eventData) {
                    console.log(eventData);
                });

                $scope.$on('tbGrid_OnRemove', function () {
                    toastr.success("Record removed");
                });

                $scope.$on('tbGrid_OnConnectionError', function (error) {
                    toastr.error(error.statusText || "Connection error");
                });

                $scope.$on('tbGrid_OnSuccessfulSave', function () {
                    toastr.success("Record updated");
                });

                // Form Events
                $scope.$on('tbForm_OnConnectionError', function (error) { toastr.error(error.statusText || "Connection error"); });

                $scope.$on('tbForm_OnSuccessfulSave', function (event, data, formScope) {
                    toastr.success("Record updated");
                    if (formScope) formScope.clear();
                });

                $scope.$on('tbForm_OnSavingNoChanges', function (event) {
                    toastr.warning("Nothing to save");
                    $location.path('/');
                });

                $scope.$on('tbForm_OnCancel', function (model, error, formScope) {
                    $location.path('/');
                });

                $scope.chartClick = function (points) {
                    angular.forEach(points, function (point) {
                        toastr.success(points[0]._chart.config.data.datasets[point._datasetIndex].label);
                    });
                };

                $scope.pieClick = function (points) {
                    angular.forEach(points, function (point) {
                        toastr.success(point._model.label + ': ' + point._model.y);
                    });
                };

                $scope.highchartClick = function (event) {
                    toastr.success(event.point.category + '-' + event.point.series.name + ': ' + event.point.y);
                };

                $scope.highpieClick = function (event) {
                    toastr.success(event.point.name + ': ' + event.point.y);
                };
            }
        ]);

    angular.module('app', [
        'ngAnimate',
        'tubular',
        'tubular-chart.directives',
        'tubular-hchart.directives',
        'toastr',
        'app.routes',
        'app.controllers'
    ]).run([
        'tubularTranslate', function (tubularTranslate) {
            // Uncomment if you want to start with Spanish
            //tubularTranslate.setLanguage('es');
            // I need to check this
            tubularTranslate.addTranslation('es', 'UI_LANG', 'English').addTranslation('en', 'UI_LANG', 'Español');
            // console.log(tubularTranslate.translationTable);
        }
    ]);
})(angular);
