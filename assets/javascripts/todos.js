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

