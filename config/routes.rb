 match "projects/:project_id/todos/list/index" => 'todo_list#index', :via => [:get]

 match "projects/:project_id/todos/list/save_order" => 'todo_list#save_order', :via => [:post]

 match "projects/:project_id/todos/list/"    => 'todo_list#create',   :via => [:post]
 match "projects/:project_id/todos/list/:id" => 'todo_list#update',   :via => [:post]
 match "projects/:project_id/todos/list/:id" => 'todo_list#delete',   :via => [:delete]

 match "projects/:project_id/todos/item/"    => 'todo_item#create',   :via => [:post]
 match "projects/:project_id/todos/item/:id" => 'todo_item#update',   :via => [:post]
 match "projects/:project_id/todos/item/:id" => 'todo_item#delete',   :via => [:delete]

 match "projects/:project_id/todos/item/toggle/:id" => 'todo_item#toggle',  :via => [:post]
