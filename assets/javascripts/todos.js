angular
    .module('redmine_todos', ['ngResource', 'ui.sortable', 'ui.date'])
    .config(function($httpProvider) {
        delete $httpProvider.defaults.headers.common['X-Requested-With'];
        $httpProvider.defaults.headers.common['Content-type', 'application/json'];
        $httpProvider.defaults.headers.common['X-CSRF-Token'] = window.csrfToken;
    })

    .filter('resolve', function() {
        return function(route, params) {
            return route.replace(/:\w+/g, function(all) {
                return params[all] || all;
            });
        };
    })

    .service('Translator', function() {
        var translations;
        return {
            setTranslations: function(newTrans) {
                translations = newTrans;
            },
            trans: function(inp) {
                return translations[inp] || inp;
            }
        }
    })

    .service('Registry', function() {
        var data = {};
        return {
            // data: data,
            has: function(key) {
                return typeof data[key] === "undefined";
            },
            get: function(key) {
                return data[key];
            },
            set: function(key, value) {
                data[key] = value;
            }
        }
    })

    .service('UsersManager', function(Translator) {
        var users;
        var currentId;
        return {
            setCurrentUserId: function(id) {
                currentId = id;
            },
            getCurrentUserId: function() {
                return currentId;
            },
            set: function(usersData) {
                users = usersData;
            },
            get: function() {
                return users;
            },
            getOptions: function() {
                return jQuery.merge([
                    {id: "", name:Translator.trans("unassigned")},
                    {id: currentId, name: ">> "+Translator.trans("me")+" <<"}
                ], users);
            },
            getById: function(id) {
                for(u in users)
                {
                    if(users[u].id == id)
                    {
                        return users[u];
                    }
                }
            }
        }
    })

    .directive('clickOutside', function($document){
        return {
            restrict: 'A',
            link: function(scope, elem, attr, ctrl) {
                $document.on('click', function(e) {
                    var $target = $(e.target);
                    if(!elem.has($target).length && !elem.is($target) && !$target.closest('.ui-datepicker-header').length)
                    {
                        scope.$apply(attr.clickOutside);
                    }
                });
            }
        }
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
                withPadLock: '@',
                withDueAssigneePill: '=',

                resource: '=',
                resourceGetter: '=',
                isActive: '=',
                isInProgress: '=',
                isError: '=',
                errorMessage: '=',
                saveCallback: '='
            },
            link: function(scope, iElement, iAttrs) {
                scope.save = function() {
                    // scope.resource.subject_new = scope.resource.subject;
                    if(scope.saveCallback) {
                        scope.saveCallback(
                            scope.getResource(),
                            function(resource) {
                                scope.resource = resource;
                            }
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
                    if(newV) scope.resource.subject_new = scope.resource.subject;
                })
            }
        };
    })

    .directive('dueAssigneePill', function($window, $parse, $timeout, Translator, UsersManager, Registry) {
        return {
            restrict: "E",
            template: $window.dueAssigneePillTemplate,
            transclude: true,
            scope: {
                todoItem: '=',
                forNewTodo: '@'
            },
            link: function(scope, iElement, iAttrs) {
                var forNewTodo = scope.forNewTodo;
                if(typeof forNewTodo === 'undefined')
                {
                    forNewTodo = false;
                }
                scope.Translator = Translator;
                scope.saveInProgress = false;
                scope.isFormVisible = false;
                scope.UsersManager = UsersManager

                scope.hasPerm = function(permName)
                {
                    currentParent = scope;
                    while(true)
                    {
                        if(currentParent.permissions)
                        {
                            return currentParent.permissions[permName];
                        }
                        currentParent = currentParent.$parent;
                    }
                };

                var justSetDetails = false;
                scope.$watch('isFormVisible', function(newV) {
                    if(newV)
                    {
                        justSetDetails = !forNewTodo;
                        if(!forNewTodo)
                        {
                            scope.todoItem.due_date_new = scope.todoItem.due_date;
                            scope.todoItem.assigned_to_id_new = scope.todoItem.assigned_to_id;
                            scope.todoItem.is_private_new = scope.todoItem.is_private;
                        }
                        if(justSetDetails)
                        {
                            $timeout(function() {
                                justSetDetails = false;
                            }, 0)
                        }
                    }
                });

                var initializing = !forNewTodo;
                scope.$watch('[todoItem.due_date_new, todoItem.assigned_to_id_new, todoItem.is_private_new]', function(newT, oldT) {
                    if(forNewTodo)
                    {
                        Registry.set('due_date_new', newT[0]);
                        Registry.set('assigned_to_id_new', newT[1]);
                        Registry.set('is_private_new', newT[2]);
                    }
                    if(initializing || justSetDetails || scope.saveInProgress)
                    {
                        justSetDetails = false;
                        initializing = false;
                        return;
                    }

                    if(!forNewTodo)
                    {
                        scope.isFormVisible = false;
                        scope.saveInProgress = true;
                        scope.todoItem.saveMode = "due_assignee";
                        scope.todoItem.$update({id:scope.todoItem.id}, function(resource) {
                            justSetDetails = true;
                            scope.saveInProgress = false;
                            scope.todoItem = resource;
                        }, function(response) {
                            handleError(response);
                            $log.error(response);
                            if(response.data) $scope.errorMessage = response.data.message;
                            scope.saveInProgress = false;

                        });
                    } else {
                        scope.todoItem.due_date = scope.todoItem.due_date_new;
                        scope.todoItem.assigned_to_id = scope.todoItem.assigned_to_id_new;
                        scope.todoItem.is_private = scope.todoItem.is_private_new;
                    }
                }, true);
                scope.assignedToName = function() {
                    var user = UsersManager.getById(scope.todoItem.assigned_to_id);
                    return user ? user.name : "";
                };
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
    .directive('ngEscape', function () {
        return function (scope, element, attrs) {
            $(document).bind("keydown keypress", function (event) {
                if(event.which === 27) {
                    scope.$apply(function (){
                        scope.$eval(attrs.ngEscape);
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

function TodoListController($scope, $window, $timeout, $filter, $http, $log, $resource, Translator, UsersManager, Registry)
{
    window.scope = $scope; // just for easier debugging
    
    function handleError(response)
    {
        alert(Translator.trans("label_ajax_error")+ " HTTP status: "+response.status+(response.data?", message:"+response.data.message:""));
    };

    $scope.routes = $window.routing;

    // Init {{
    var transformRequest = function(data, headersGetter)
    {
        delete data['todo_items'];
        return JSON.stringify(data);
    };
    var TodoList = $resource($scope.routes.endpoint_todo_list, {}, {
        save:   {method:'POST', transformRequest: transformRequest},
        update: {method:'POST', transformRequest: transformRequest}
    });
    var TodoItem = $resource($scope.routes.endpoint_todo_item, {}, {
        update: {method:'POST'}
    });

    Translator.setTranslations($window.translations);
    $scope.Translator = Translator;
    $scope.permissions = $window.permissions;

    $scope.completed_todo_status = $window.completed_todo_status;
    $scope.uncompleted_todo_status = $window.uncompleted_todo_status;

    UsersManager.setCurrentUserId($window.user.id);
    UsersManager.set($window.assignable_users.map(function(data){
        return {
            id: data.user.id,
            name: data.user.firstname+" "+data.user.lastname
        };
    }));

    $scope.isConfigured = function() {
        return $scope.completed_todo_status && $scope.uncompleted_todo_status;
    };

    $scope.todoLists = {
        data: []
    };
    $scope.prospects = {
        todoList: new TodoList(),
        todoItem: undefined,
        recreateTodoItem: function(userId) {
            this.todoItem = new TodoItem();
            this.todoItem.due_date = Registry.get('due_date_new');
            this.todoItem.due_date_new = Registry.get('due_date_new');
            this.todoItem.assigned_to_id = userId || Registry.get('assigned_to_id_new')
            this.todoItem.assigned_to_id_new = userId || Registry.get('assigned_to_id_new')
            this.todoItem.is_private = Registry.get('is_private_new')
            this.todoItem.is_private_new = Registry.get('is_private_new')
        }
    };
    $scope.prospects.recreateTodoItem(UsersManager.getCurrentUserId());

    $scope.isTodoCompleted = function(todoItem) {
        return todoItem.status_id == $scope.completed_todo_status;
    };

    $scope.todoLists.data = $window.todoLists.map(function(list) {
        list.subject = list.name;
        delete list.name;
        if(list.todo_items)
        {
            if($window.recentlyCompleted[list.id])
            {
                jQuery.merge(list.todo_items, $window.recentlyCompleted[list.id]);
            }

            list.todo_items = list.todo_items.map(function(item) {
                item['commentsNb'] = $window.comments_nbs[item.id] || 0;
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
        // $scope.resetState();
        $scope.savingTodoList = true;
        $scope.saveInProgress = true;
        $scope.saveStarted = true;
        resource.$save({}, function(resource) {
            $scope.saveInProgress = false;
            $scope.todoLists.data.unshift(resource);
            $scope.prospects.todoList = new TodoList();
            $scope.setState('ducktypingTodoItem', resource.id);
        }, function(response) {
            handleError(response);
            $log.error(response);
            if(response.data) $scope.errorMessage = response.data.message;
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

            $scope.prospects.recreateTodoItem();
            $scope.setState('ducktypingTodoItem', todo_list_id);

        }, function(response) {
            handleError(response);
            $log.error(response.data.message);
            if(response.data) $scope.errorMessage = response.data.message;
            $scope.setState('ducktypingTodoItem', todo_list_id);
            $scope.saveInProgress = false;
            $scope.saveError = true;
        });
        // $scope.resetState();
    };

    $scope.updateTodoList = function(resource, success) {
        if($scope.saveInProgress) return;
        $scope.savingTodoList = true;
        $scope.saveInProgress = true;
        $scope.saveStarted = true;

        resource.$update({id:resource.id}, function(resource) {
            $scope.resetState();
            (success||$.noop)(resource);
        }, function(response) {
            handleError(response);
            $log.error(arguments, response);
            if(response.data) $scope.errorMessage = response.data.message;
            $scope.saveInProgress = false;
            $scope.saveError = true;
        });
    };

    $scope.updateTodo = function(resource, success) {
        if($scope.saveInProgress) return;
        $scope.savingTodoItem = true;
        $scope.saveInProgress = true;
        $scope.saveStarted = true;
        resource.saveMode = "name";
        resource.$update({id:resource.id}, function(resource) {
            $scope.resetState();
            (success||$.noop)(resource);
        }, function(response) {
            handleError(response);
            $log.error(response);
            if(response.data) $scope.errorMessage = response.data.message;
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
            $scope.resetState();
        }, function(response) {
            handleError(response);
            $log.error(response);
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
        }, function(response) {
            handleError(response);
            $log.error(response);
            if(response.data) $scope.errorMessage = response.data.message;
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
        if(!permissions.update_todos)
        {
            todoItem.completed = !todoItem.completed;
            return;
        }

        var completed = todoItem.completed;
        $http.post($filter('resolve')($scope.routes.toggle_todo, {':id': todoItem.id }), {
            completed: completed
        }).success(function(response){
            todoItem.status_id = completed ? $scope.completed_todo_status : $scope.uncompleted_todo_status;
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
        stop: stopEventHandler,
        disabled: !$scope.permissions.update_todo_lists
    };

    $scope.sortableOptionsTodoItem = {
        axis: 'y',
        connectWith: ".todo_lists .todo_list > ol",
        handle: '.todoContents > a',
        stop: stopEventHandler,
        disabled: !$scope.permissions.update_todos
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

