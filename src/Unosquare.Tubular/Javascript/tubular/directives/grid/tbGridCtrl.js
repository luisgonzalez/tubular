﻿(function (angular) {
    'use strict';

    angular.module('tubular.directives')
        .controller('tbGridController',
        [
            '$scope',
            'localStorageService',
            'tubularPopupService',
            'tubularModel',
            'tubularHttp',
            '$routeParams',
            'tubularConfig',
            function (
                $scope,
                localStorageService,
                tubularPopupService,
                TubularModel,
                tubularHttp,
                $routeParams,
                tubularConfig) {
                var $ctrl = this;

                $ctrl.$onInit = function () {
                    $ctrl.tubularDirective = 'tubular-grid';

                    $ctrl.name = $ctrl.name || 'tbgrid';
                    $ctrl.columns = [];
                    $ctrl.rows = [];

                    $ctrl.savePage = angular.isUndefined($ctrl.savePage) ? true : $ctrl.savePage;
                    $ctrl.currentPage = $ctrl.savePage ? (localStorageService.get($ctrl.name + '_page') || 1) : 1;

                    $ctrl.savePageSize = angular.isUndefined($ctrl.savePageSize) ? true : $ctrl.savePageSize;
                    $ctrl.pageSize = $ctrl.pageSize || 20;
                    $ctrl.saveSearch = angular.isUndefined($ctrl.saveSearch) ? true : $ctrl.saveSearch;
                    $ctrl.totalPages = 0;
                    $ctrl.totalRecordCount = 0;
                    $ctrl.filteredRecordCount = 0;
                    $ctrl.requestedPage = $ctrl.currentPage;
                    $ctrl.hasColumnsDefinitions = false;
                    $ctrl.requestCounter = 0;
                    $ctrl.requestMethod = $ctrl.requestMethod || 'POST';
                    $ctrl.serverSaveMethod = $ctrl.serverSaveMethod || 'POST';
                    $ctrl.requestTimeout = 20000;
                    $ctrl.currentRequest = null;
                    $ctrl.autoSearch = $routeParams.param ||
                        ($ctrl.saveSearch ? (localStorageService.get($ctrl.name + '_search') || '') : '');
                    $ctrl.search = {
                        Text: $ctrl.autoSearch,
                        Operator: $ctrl.autoSearch === '' ? 'None' : 'Auto'
                    };

                    $ctrl.isEmpty = false;
                    $ctrl.dataService = tubularHttp.getDataService($ctrl.dataServiceName);
                    $ctrl.tempRow = new TubularModel($scope, $ctrl, {}, $ctrl.dataService);
                    $ctrl.requireAuthentication = $ctrl.requireAuthentication ? ($ctrl.requireAuthentication === 'true') : true;
                    tubularConfig.webApi.requireAuthentication($ctrl.requireAuthentication);
                    $ctrl.editorMode = $ctrl.editorMode || 'none';
                    $ctrl.canSaveState = false;
                    $ctrl.showLoading = angular.isUndefined($ctrl.showLoading) ? true : $ctrl.showLoading;
                    $ctrl.autoRefresh = angular.isUndefined($ctrl.autoRefresh) ? true : $ctrl.autoRefresh;
                    $ctrl.serverDeleteUrl = $ctrl.serverDeleteUrl || $ctrl.serverSaveUrl;

                    // Emit a welcome message
                    $scope.$emit('tbGrid_OnGreetParentController', $ctrl);
                };

                $scope.$watch('$ctrl.columns', function () {
                    if ($ctrl.hasColumnsDefinitions === false || $ctrl.canSaveState === false) {
                        return;
                    }

                    localStorageService.set($ctrl.name + '_columns', $ctrl.columns);
                },
                    true);

                $scope.$watch('$ctrl.serverUrl', function (newVal, prevVal) {
                    if ($ctrl.hasColumnsDefinitions === false || $ctrl.currentRequest || newVal === prevVal) {
                        return;
                    }

                    $ctrl.retrieveData();
                });

                $scope.$watch('$ctrl.hasColumnsDefinitions', function (newVal) {
                    if (newVal !== true) {
                        return;
                    }

                    $ctrl.retrieveData();
                });

                $scope.$watch('$ctrl.pageSize', function () {
                    if ($ctrl.hasColumnsDefinitions && $ctrl.requestCounter > 0) {
                        if ($ctrl.savePageSize) {
                            localStorageService.set($ctrl.name + '_pageSize', $ctrl.pageSize);
                        }
                        $ctrl.retrieveData();
                    }
                });

                $scope.$watch('$ctrl.requestedPage', function () {
                    if ($ctrl.hasColumnsDefinitions && $ctrl.requestCounter > 0) {
                        $ctrl.retrieveData();
                    }
                });

                $ctrl.saveSearch = function () {
                    if ($ctrl.saveSearch) {
                        if ($ctrl.search.Text === '') {
                            localStorageService.remove($ctrl.name + '_search');
                        } else {
                            localStorageService.set($ctrl.name + '_search', $ctrl.search.Text);
                        }
                    }
                };

                $ctrl.addColumn = function (item) {
                    if (item.Name == null) return;

                    if ($ctrl.hasColumnsDefinitions !== false) {
                        throw 'Cannot define more columns. Column definitions have been sealed';
                    }

                    $ctrl.columns.push(item);
                };

                $ctrl.newRow = function (template, popup, size, data) {
                    $ctrl.tempRow = new TubularModel($scope, $ctrl, data || {}, $ctrl.dataService);
                    $ctrl.tempRow.$isNew = true;
                    $ctrl.tempRow.$isEditing = true;
                    $ctrl.tempRow.$component = $ctrl;

                    if (angular.isDefined(template) && angular.isDefined(popup) && popup) {
                        tubularPopupService.openDialog(template, $ctrl.tempRow, $ctrl, size);
                    }
                };

                $ctrl.deleteRow = function (row) {
                    // TODO: Should I move this behavior to model?
                    var urlparts = $ctrl.serverDeleteUrl.split('?');
                    var url = urlparts[0] + '/' + row.$key;

                    if (urlparts.length > 1) {
                        url += '?' + urlparts[1];
                    }

                    var request = {
                        serverUrl: url,
                        requestMethod: 'DELETE',
                        timeout: $ctrl.requestTimeout,
                        requireAuthentication: $ctrl.requireAuthentication
                    };

                    $ctrl.currentRequest = $ctrl.dataService.retrieveDataAsync(request);

                    $ctrl.currentRequest.then(
                        function (data) {
                            row.$hasChanges = false;
                            $scope.$emit('tbGrid_OnRemove', data);
                        },
                        function (error) {
                            $scope.$emit('tbGrid_OnConnectionError', error);
                        })
                        .then(function () {
                            $ctrl.currentRequest = null;
                            $ctrl.retrieveData();
                        });
                };

                $ctrl.verifyColumns = function () {
                    var columns = localStorageService.get($ctrl.name + '_columns');
                    if (columns == null || columns === '') {
                        // Nothing in settings, saving initial state
                        localStorageService.set($ctrl.name + '_columns', $ctrl.columns);
                        return;
                    }

                    angular.forEach(columns,
                        function (column) {
                            var filtered = $ctrl.columns.filter(function (el) { return el.Name === column.Name; });

                            if (filtered.length === 0) {
                                return;
                            }

                            var current = filtered[0];
                            // Updates visibility by now
                            current.Visible = column.Visible;

                            // Update sorting
                            if ($ctrl.requestCounter < 1) {
                                current.SortOrder = column.SortOrder;
                                current.SortDirection = column.SortDirection;
                            }

                            // Update Filters
                            if (current.Filter != null && current.Filter.Text != null) {
                                return;
                            }

                            if (column.Filter != null &&
                                column.Filter.Text != null &&
                                column.Filter.Operator !== 'None') {
                                current.Filter = column.Filter;
                            }
                        });
                };

                $ctrl.getRequestObject = function (skip) {
                    return {
                        serverUrl: $ctrl.serverUrl,
                        requestMethod: $ctrl.requestMethod || 'POST',
                        timeout: $ctrl.requestTimeout,
                        requireAuthentication: $ctrl.requireAuthentication,
                        data: {
                            Count: $ctrl.requestCounter,
                            Columns: $ctrl.columns,
                            Skip: skip,
                            Take: parseInt($ctrl.pageSize),
                            Search: $ctrl.search,
                            TimezoneOffset: new Date().getTimezoneOffset()
                        }
                    };
                };

                $ctrl.retrieveData = function () {
                    // If the ServerUrl is empty skip data load
                    if (!$ctrl.serverUrl || $ctrl.currentRequest !== null) {
                        return;
                    }

                    $ctrl.canSaveState = true;
                    $ctrl.verifyColumns();

                    if ($ctrl.savePageSize) {
                        $ctrl.pageSize = (localStorageService.get($ctrl.name + '_pageSize') || $ctrl.pageSize);
                    }

                    if ($ctrl.pageSize < 10) $ctrl.pageSize = 20; // default

                    var newPages = Math.ceil($ctrl.totalRecordCount / $ctrl.pageSize);
                    if ($ctrl.requestedPage > newPages) $ctrl.requestedPage = newPages;

                    var skip = ($ctrl.requestedPage - 1) * $ctrl.pageSize;

                    if (skip < 0) skip = 0;

                    var request = $ctrl.getRequestObject(skip);

                    if (angular.isUndefined($ctrl.onBeforeGetData) === false) {
                        $ctrl.onBeforeGetData();
                    }

                    $scope.$emit('tbGrid_OnBeforeRequest', request, $ctrl);

                    $ctrl.currentRequest = $ctrl.dataService.retrieveDataAsync(request);

                    $ctrl.currentRequest.then($ctrl.processPayload, function (error) {
                        $ctrl.requestedPage = $ctrl.currentPage;
                        $scope.$emit('tbGrid_OnConnectionError', error);
                    }).then(function () {
                        $ctrl.currentRequest = null;
                    });
                };

                $ctrl.processPayload = function (data) {
                    $ctrl.requestCounter += 1;

                    if (angular.isUndefined(data) || data == null) {
                        $scope.$emit('tbGrid_OnConnectionError',
                            {
                                statusText: 'Data is empty',
                                status: 0
                            });

                        return;
                    }

                    $ctrl.dataSource = data;

                    if (!data.Payload) {
                        var errorMsg = 'tubularGrid(' + $ctrl.$id + '): response is invalid.';
                        $ctrl.currentRequest.cancel(errorMsg);
                        $scope.$emit('tbGrid_OnConnectionError', errorMsg);
                        return;
                    }

                    $ctrl.rows = data.Payload.map(function (el) {
                        var model = new TubularModel($scope, $ctrl, el, $ctrl.dataService);
                        model.$component = $ctrl;

                        model.editPopup = function (template, size) {
                            tubularPopupService
                                .openDialog(template,
                                new TubularModel($scope, $ctrl, el, $ctrl.dataService),
                                $ctrl,
                                size);
                        };

                        return model;
                    });

                    $scope.$emit('tbGrid_OnDataLoaded', $ctrl);

                    $ctrl.aggregationFunctions = data.AggregationPayload;
                    $ctrl.currentPage = data.CurrentPage;
                    $ctrl.totalPages = data.TotalPages;
                    $ctrl.totalRecordCount = data.TotalRecordCount;
                    $ctrl.filteredRecordCount = data.FilteredRecordCount;
                    $ctrl.isEmpty = $ctrl.filteredRecordCount === 0;

                    if ($ctrl.savePage) {
                        localStorageService.set($ctrl.name + '_page', $ctrl.currentPage);
                    }
                };

                $ctrl.sortColumn = function (columnName, multiple) {
                    var filterColumn = $ctrl.columns.filter(function (el) {
                        return el.Name === columnName;
                    });

                    if (filterColumn.length === 0) return;

                    var column = filterColumn[0];

                    if (column.Sortable === false) return;

                    // need to know if it's currently sorted before we reset stuff
                    var currentSortDirection = column.SortDirection;
                    var toBeSortDirection = currentSortDirection === 'None'
                        ? 'Ascending'
                        : currentSortDirection === 'Ascending' ? 'Descending' : 'None';

                    // the latest sorting takes less priority than previous sorts
                    if (toBeSortDirection === 'None') {
                        column.SortOrder = -1;
                        column.SortDirection = 'None';
                    } else {
                        column.SortOrder = Number.MAX_VALUE;
                        column.SortDirection = toBeSortDirection;
                    }

                    // if it's not a multiple sorting, remove the sorting from all other columns
                    if (multiple === false) {
                        angular.forEach($ctrl.columns.filter(function (col) { return col.Name !== columnName; }),
                            function (col) {
                                col.SortOrder = -1;
                                col.SortDirection = 'None';
                            });
                    }

                    // take the columns that actually need to be sorted in order to re-index them
                    var currentlySortedColumns = $ctrl.columns.filter(function (col) {
                        return col.SortOrder > 0;
                    });

                    // re-index the sort order
                    currentlySortedColumns.sort(function (a, b) {
                        return a.SortOrder === b.SortOrder ? 0 : a.SortOrder > b.SortOrder;
                    });

                    angular.forEach(currentlySortedColumns, function (col, index) {
                        col.SortOrder = index + 1;
                    });

                    $scope.$broadcast('tbGrid_OnColumnSorted');
                    $ctrl.retrieveData();
                };

                $ctrl.selectedRows = function () {
                    return localStorageService.get($ctrl.name + '_rows') || [];
                };

                $ctrl.clearSelection = function () {
                    angular.forEach($ctrl.rows,
                        function (value) {
                            value.$selected = false;
                        });

                    localStorageService.set($ctrl.name + '_rows', []);
                };

                $ctrl.isEmptySelection = function () {
                    return $ctrl.selectedRows().length === 0;
                };

                $ctrl.selectFromSession = function (row) {
                    row.$selected = $ctrl.selectedRows().filter(function (el) { return el.$key === row.$key; }).length > 0;
                };

                $ctrl.changeSelection = function (row) {
                    if (angular.isUndefined(row)) {
                        return;
                    }

                    row.$selected = !row.$selected;

                    var rows = $ctrl.selectedRows();

                    if (row.$selected) {
                        rows.push({ $key: row.$key });
                    } else {
                        rows = rows.filter(function (el) {
                            return el.$key !== row.$key;
                        });
                    }

                    localStorageService.set($ctrl.name + '_rows', rows);
                };

                $ctrl.getFullDataSource = function (callback) {
                    var request = $ctrl.getRequestObject(0);
                    request.data.Take = -1;
                    request.data.Search = {
                        Text: '',
                        Operator: 'None'
                    };
                    $ctrl.dataService.retrieveDataAsync(request).then(
                        function (data) {
                            callback(data.Payload);
                        },
                        function (error) {
                            $scope.$emit('tbGrid_OnConnectionError', error);
                        })
                        .then(function () {
                            $ctrl.currentRequest = null;
                        });
                };

                $ctrl.visibleColumns = function () {
                    return $ctrl.columns.filter(function (el) { return el.Visible; }).length;
                };
            }
        ]);
})(angular);