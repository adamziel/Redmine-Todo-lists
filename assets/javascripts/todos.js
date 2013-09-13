angular
    .module('redmine_todos', ['ngResource', 'ui.sortable'])
    .config(function($httpProvider) {
        $httpProvider.defaults.headers.common['X-Requested-With'];
        $httpProvider.defaults.headers.common['X-CSRF-Token'] = window.csrfToken;
    })

    .filter('resolve', function() {
        return function(route, params) {
            return route.replace(/:\w+/g, function(all) {
                return params[all] || all;
            });
        };
    })

    .directive('todoResourceEditForm', function($window, $parse) {
        return {
            restrict: "E",
            template: $window.todoResourceEditFormTemplate,
            transclude: true,
            scope: {
                placeholder: '=',
                labelSaveChanges: '=',
                labelCancel: '=',
                withCheckbox: '=',

                resource: '=',
                resourceGetter: '=',
                isActive: '=',
                isInProgress: '=',
                isError: '=',
                saveCallback: '='
            },
            link: function(scope, iElement, iAttrs) {
                scope.save = function() {
                    scope.resource.name = scope.resource.name_editable ;
                    if(scope.saveCallback) {
                        scope.saveCallback(
                            scope.getResource()
                        );
                    } else {
                        scope.resource.$save();
                    }
                };
                scope.cancel = function() {
                    if(iAttrs["onCancel"]) {
                        var fn = $parse(iAttrs["onCancel"]);
                        fn(scope.$parent);
                    } else {
                        scope.isActive = false;
                    }
                }
                scope.getResource = function() {
                    return scope.resource; // || scope.resourceGetter();
                };
                scope.$watch('isActive', function(newV) {
                    if(newV) scope.resource.name_editable = scope.resource.name;
                })
            }
        };
    })
;

angular
    .module('ng').directive('ngFocus', function($timeout) {
        return {
            link: function ( scope, element, attrs ) {
                scope.$watch( attrs.ngFocus, function ( val ) {
                    if ( angular.isDefined( val ) && val ) {
                        $timeout( function () { element[0].focus(); } );
                    }
                }, true);

                element.bind('blur', function () {
                    if ( angular.isDefined( attrs.ngFocusLost ) ) {
                        scope.$apply( attrs.ngFocusLost );
                    }
                });
            }
        };
    })
    .directive('ngEnter', function () {
        return function (scope, element, attrs) {
            element.bind("keydown keypress", function (event) {
                if(event.which === 13) {
                    scope.$apply(function (){
                        scope.$eval(attrs.ngEnter);
                    });

                    event.preventDefault();
                }
            });
        };
    })
    .directive('ngElastic', function () {
        return function (scope, element, attrs) {
            $(element).TextAreaExpander();
        };
    })
;
angular
    .module('ui.sortable', [])
    .value('uiSortableConfig',{})
    .directive('uiSortable', [ 'uiSortableConfig',
        function(uiSortableConfig) {
            return {
                require: '?ngModel',
                link: function(scope, element, attrs, ngModel) {

                    function combineCallbacks(first,second){
                        if( second && (typeof second === "function") ){
                            return function(e,ui){
                                first(e,ui);
                                second(e,ui);
                            };
                        }
                        return first;
                    }

                    var opts = {};

                    var callbacks = {
                        receive: null,
                        remove:null,
                        start:null,
                        stop:null,
                        update:null
                    };

                    var apply = function(e, ui) {
                        if (ui.item.sortable.resort || ui.item.sortable.relocate) {
                            scope.$apply();
                        }
                    };

                    angular.extend(opts, uiSortableConfig);

                    if (ngModel) {

                        ngModel.$render = function() {
                            element.sortable( "refresh" );
                        };

                        callbacks.start = function(e, ui) {
                            // Save position of dragged item
                            ui.item.sortable = { index: ui.item.index() };
                        };

                        callbacks.update = function(e, ui) {
                            // For some reason the reference to ngModel in stop() is wrong
                            ui.item.sortable.resort = ngModel;
                        };

                        callbacks.receive = function(e, ui) {
                            ui.item.sortable.relocate = true;
                            // added item to array into correct position and set up flag
                            ngModel.$modelValue.splice(ui.item.index(), 0, ui.item.sortable.moved);
                        };

                        callbacks.remove = function(e, ui) {
                            // copy data into item
                            if (ngModel.$modelValue.length === 1) {
                                ui.item.sortable.moved = ngModel.$modelValue.splice(0, 1)[0];
                            } else {
                                ui.item.sortable.moved =  ngModel.$modelValue.splice(ui.item.sortable.index, 1)[0];
                            }
                        };

                        callbacks.stop = function(e, ui) {
                            // digest all prepared changes
                            if (ui.item.sortable.resort && !ui.item.sortable.relocate) {

                                // Fetch saved and current position of dropped element
                                var end, start;
                                start = ui.item.sortable.index;
                                end = ui.item.index();

                                // Reorder array and apply change to scope
                                ui.item.sortable.resort.$modelValue.splice(end, 0, ui.item.sortable.resort.$modelValue.splice(start, 1)[0]);

                            }
                        };

                    }


                    scope.$watch(attrs.uiSortable, function(newVal, oldVal){
                        angular.forEach(newVal, function(value, key){

                            if( callbacks[key] ){
                                // wrap the callback
                                value = combineCallbacks( callbacks[key], value );

                                if ( key === 'stop' ){
                                    // call apply after stop
                                    value = combineCallbacks( value, apply );
                                }
                            }

                            element.sortable('option', key, value);
                        });
                    }, true);

                    angular.forEach(callbacks, function(value, key ){

                        opts[key] = combineCallbacks(value, opts[key]);
                    });

                    // call apply after stop
                    opts.stop = combineCallbacks( opts.stop, apply );

                    // Create sortable

                    element.sortable(opts);
                }
            };
        }
    ])
;

function TodoListController($scope, $window, $timeout, $filter, $http, $resource)
{
    window.scope = $scope;

    // Init {{
    var transformRequest = function(data, headersGetter)
    {
        delete data['todo_items'];
        return JSON.stringify(data);
    };
    var TodoList = $resource(routing.endpoint_todo_list, {}, {
        save:   {method:'POST', transformRequest: transformRequest},
        update: {method:'POST', transformRequest: transformRequest}
    });
    var TodoItem = $resource(routing.endpoint_todo_item, {}, {
        update: {method:'POST'}
    });

    $scope.routes = $window.routing;
    $scope.permissions = $window.permissions;;
    $scope.completed_todo_status = $window.completed_todo_status;
    $scope.uncompleted_todo_status = $window.uncompleted_todo_status;

    $scope.isConfigured = function() {
        return $scope.completed_todo_status && $scope.uncompleted_todo_status;
    };

    $scope.todoLists = {
        data: []
    };
    $scope.prospects = {
        todoList: new TodoList(),
        todoItem: new TodoItem()
    }

    $scope.isTodoCompleted = function(todoItem) {
        return todoItem.issue && todoItem.issue.status_id == $scope.completed_todo_status;
    };

    $scope.todoLists.data = $window.todoLists.map(function(list) {
        if(list.todo_items)
        {
            if($window.recentlyCompleted[list.id])
            {
                jQuery.merge(list.todo_items, $window.recentlyCompleted[list.id]);
            }

            list.todo_items = list.todo_items.map(function(item) {
                if(item['issue'])
                {
                    item['name'] = item['issue']['subject'];
                }
                item['completed'] = $scope.isTodoCompleted(item);
                if(item['completed_at'])
                {
                    item['completed_at'] = (new Date(item['completed_at'])).getTime();
                }
                return new TodoItem(item);
            });
        }
        list = new TodoList(list);
        return list;
    });
    // }}

    // State management {{

    $scope.resetState = function() {
        $scope.ducktypingTodoItem = false;
        $scope.ducktypingTodoList = false;

        $scope.editingTodoItem = false;
        $scope.editingTodoList = false;

        $scope.deletingTodoItem = false;
        $scope.deletingTodoList = false;

        $scope.saveInProgress = false;
        $scope.saveStarted = false;
        $scope.saveError = false;
    };

    $scope.saveError = function() {
        return $scope.saveStarted === true && $scope.saveError === true && $scope.saveInProgress === false;
    };
    $scope.saveSuccessful = function() {
        return $scope.saveStarted === true && $scope.saveError === false && $scope.saveInProgress === false;
    };
    $scope.resetState();
    $scope.setState = function(state, value)
    {
        if(typeof value === "undefined") value = true;
        $scope.resetState();
        $timeout(function() {
            $scope.$apply(function() {
                $scope[state] = value;
            });
        }, 1)
    }

    $scope.$watch('ducktypingTodoItem', function(newV) {
        $scope.prospects.todoItem.todo_list_id = newV;
        $scope.prospects.todoItem.name = '';
    });

    // }}

    // Blob of save handlers, that could have been done better {{

    $scope.createTodoList = function(resource) {
        if($scope.saveInProgress) return;
        $scope.resetState();
        $scope.savingTodoList = true;
        $scope.saveInProgress = true;
        $scope.saveStarted = true;
        resource.$save({}, function(resource) {
            $scope.saveInProgress = false;
            $scope.todoLists.data.push(resource);
            $scope.prospects.todoList = new TodoList();
            $scope.setState('ducktypingTodoItem', resource.id);
        }, function() {
            $scope.setState('ducktypingTodoList');
            $scope.saveInProgress = false;
            $scope.saveError = true;
        });
    };

    $scope.createTodo = function(resource) {
        if($scope.saveInProgress) return;
        $scope.savingTodoItem = true;
        $scope.saveInProgress = true;
        $scope.saveStarted = true;

        var todo_list_id = $scope.prospects.todoItem.todo_list_id;

        resource.todo_list_id = todo_list_id;
        resource.$save({}, function(resource) {
            var list = $scope.findListById(todo_list_id)[1];
            list.todo_items = list.todo_items || [];
            list.todo_items.push(resource);
            $scope.prospects.todoItem = new TodoItem();
            $scope.setState('ducktypingTodoItem', todo_list_id);
        }, function() {
            $scope.setState('ducktypingTodoItem', todo_list_id);
            $scope.saveInProgress = false;
            $scope.saveError = true;
        });
        // $scope.resetState();
    };

    $scope.updateTodoList = function(resource) {
        if($scope.saveInProgress) return;
        $scope.savingTodoList = true;
        $scope.saveInProgress = true;
        $scope.saveStarted = true;

        resource.$update({id:resource.id}, function(resource) {
            $scope.resetState();
        }, function() {
            $scope.saveInProgress = false;
            $scope.saveError = true;
        });
    };

    $scope.updateTodo = function(resource) {
        if($scope.saveInProgress) return;
        $scope.savingTodoItem = true;
        $scope.saveInProgress = true;
        $scope.saveStarted = true;

        resource.$update({id:resource.id}, function(resource) {
            $scope.resetState();
        }, function() {
            $scope.saveInProgress = false;
            $scope.saveError = true;
        });
    };

    $scope.deleteTodoList = function(resource) {
        if($scope.deletingTodoList) return;
        if(!window.confirm("Are you sure you want to delete this to-do list?")) return;
        $scope.resetState();
        $scope.deletingTodoList = resource.id;

        var id = resource.id;
        var idx = $scope.findListById(id)[0];
        resource.$delete({id:id}, function() {
            $scope.todoLists.data.splice(idx, 1);
        }, function() {
            alert('Sorry, there was an error :(');
            $scope.resetState();
        });
    };

    $scope.deleteTodo = function(resource) {
        if($scope.deletingTodoList) return;
        if(!window.confirm("Are you sure you want to delete this to-do?")) return;
        $scope.resetState();
        $scope.deletingTodoItem = resource.id;

        var id = resource.id;
        var todo_list_id = resource.todo_list_id;
        var list = $scope.findListById(todo_list_id)[1];
        var itemIdx = $scope.findTodoById(id)[0];

        resource.$delete({id: id}, function(resource) {
            list.todo_items.splice(itemIdx, 1);
            $scope.resetState();
        }, function() {
            alert('Sorry, there was an error :(');
            $scope.resetState();
        });
    };

    var saveListOrderCalls = 0;
    var saveListOrderInProgress = false;
    $scope.saveListsOrder = function() {
        ++saveListOrderCalls;
        if(saveListOrderInProgress) return;
        saveListOrderInProgress = true;

        var post = {
            lists: {},
            items: {},
            items_parents: {}
        };
        jQuery.each($scope.todoLists.data, function(idx,list) {
            post.lists[list.id] = idx;
            jQuery.each(list.todo_items, function(idx, item) {
                item.todo_list_id = list.id;
                post.items[item.id] = idx;
                post.items_parents[item.id] = list.id;
            })
        });

        $http.post($scope.routes.store_order, post).success(function() {
            saveListOrderInProgress = false;
            if(saveListOrderCalls > 1)
            {
                $scope.saveListsOrder();
            }
            saveListOrderCalls = 0;
        });
    };

    $scope.toggleTodoItem = function(todoItem) {
        var completed = todoItem.completed;
        $http.post($filter('resolve')($scope.routes.toggle_todo, {':id': todoItem.id }), {
            completed: completed
        }).success(function(response){
            todoItem.issue.status_id = completed ? $scope.completed_todo_status : $scope.uncompleted_todo_status;
            todoItem.completed_at = (new Date(response.completed_at)).getTime();
        });
    };
    // }}

    // Utils {{

    $scope.hasAnyPermission = function() {
        var has = false;
        jQuery.each(arguments, function(index, value) {
            if($scope.permissions[value] === true)
            {
                has = true;
                return;
            }
        })
        return has;
    };

    var stopEventHandler = function(event, ui) {
        $scope.$apply(function() {
            $scope.saveListsOrder.call($scope);
        });
    };

    $scope.sortableOptionsTodoList = {
        axis: 'y',
        handle: 'header',
        stop: stopEventHandler
    };

    $scope.sortableOptionsTodoItem = {
        axis: 'y',
        connectWith: ".todo_lists .todo_list > ol",
        stop: stopEventHandler
    };

    $scope.findListById = function(id) {
        var sidx;
        var list;
        jQuery.each($scope.todoLists.data, function(idx, todoList) {
            if(todoList.id === id)
            {
                sidx = idx;
                list = todoList;
                return;
            }
        });
        return [sidx, list];
    };

    $scope.findTodoById = function(id) {
        var sidx;
        var item;
        jQuery.each($scope.todoLists.data, function(idx, todoList) {
            jQuery.each(todoList.todo_items, function(idx, todoItem) {
                if(todoItem.id === id)
                {
                    sidx = idx;
                    item = todoList;
                    return;
                }
            });
            if(item) return;
        });
        return [sidx, item];
    };

    $scope.isTodoCompletedFactory = function(expectedValue) {
        return function(todoItem) {
            return expectedValue === $scope.isTodoCompleted(todoItem);
        };
    };
    // }}

};

