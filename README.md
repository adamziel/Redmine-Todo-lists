## Unfortunately I am not actively maintaining this plugin. I'd love to accept any Pull Request that makes it better in any way!

### Todo Lists for Redmine

This is a quick implementation of basecamp-like to-do lists. Every to-do item is an "Issue" behind the scenes - this way you can track everything in the "Issues" tab: discuss, upload files, and so on.

### Requirements

1. Ruby 2.x (*should* work with 1.9 and 1.8 too, however there were [some issues reported](https://github.com/AZielinski/Redmine-Todo-lists/issues/34))
1. PostgreSQL/MySQL/SQL Server (a few features are missing on SQL server though)
1. Rails 4.x 

### Installation

1. Clone this repo to plugins/ directory (so all files are in plugins/redmine_todos)
1. Really make sure all the files are in plugins/redmine_todos - git clone will clone it to Redmine-Todo-lists by default so you have to rename the directory
1. Make sure one more time everything is in plugin/redmine_todos :)
1. Set `RAILS_ENV` to production (unless you explicitly want to use other environment) by running `export RAILS_ENV=production`
1. Run `rake redmine:plugins:migrate`
1. Configure the plugin in admin > plugins
1. Setup per-role permissions in admin > roles (this plugin comes with multiple new types of permissions)

### Do you like it?

Why don't you star this repo? It is great way to say "I like this thing!"

### Caveats

1. As you probably noticed - it is really important to put it in the plugins/redmine_todos directory, if you forgot to rename the directory, you should rename it and rerun `rake redmine:plugins:migrate RAILS_ENV=...`
1. Are there tables missing in your database after the installation? There were some reports that running `rake db:migrate` and then re-running `rake redmine:plugins:migrate` may help

### Features

* To-do lists management
* Private to-dos and to-do lists
* Very friendly Ajax UI - heavily inspired by basecamp and created with Angular.js
* Enter To-do items as simple as: type, enter, type, enter
* Add an existing issue to your To-do list by typing `#` and issue number
* Reorder and move to-do items between lists with ease by dragging them
* Reorder to-do lists by dragging them
* Assign items to users and set due dates with a few clicks right from the list
* If you will update an "issue" entity in a different module, this plugin will know about it
* Manage access

### Not sure? Check out these screenshots:

1. [Basic view](https://raw.github.com/AZielinski/Redmine-Todo-lists/d26d9f9e655eb5a81ecda6650fd66b43f29763a9/screenshots/basic_view.jpg)
1. [Adding a to-do](https://raw.github.com/AZielinski/Redmine-Todo-lists/d26d9f9e655eb5a81ecda6650fd66b43f29763a9/screenshots/add_todo.jpg)
1. [Adding a to-do list](https://raw.github.com/AZielinski/Redmine-Todo-lists/d26d9f9e655eb5a81ecda6650fd66b43f29763a9/screenshots/add_todo_list.jpg)
1. [Assigning a to-do list and setting due date](https://raw.github.com/AZielinski/Redmine-Todo-lists/d26d9f9e655eb5a81ecda6650fd66b43f29763a9/screenshots/assign_todo.jpg)
1. [Reordering to-dos](https://raw.github.com/AZielinski/Redmine-Todo-lists/d26d9f9e655eb5a81ecda6650fd66b43f29763a9/screenshots/reorder_todos.jpg)

### Notes

* 0% test coverage
* Works with MySQL and PostgreSQL
* Tested only under firefox 23 and chrome 28 - it probably won't work well with IE (especially since angular.js is involved and no compability changes were performed)
* Info for devs: I noticed that on dev server (WEBrick) managing issues sometimes results with an error 500 (error message points me to some other plugin I have). There are no problems on production server though.

### Disclaimer

I use a local redmine installation to keep things organized. I created this plugin for myself, but I thought it might be useful for someone somewhere.

By no means I am a rails programmer - this is the first piece of ruby code I ever wrote, and probably there are some horrible mistakes in there. I didn't create this plugin as a perfect example of code for all to see, I created it because I desperately lacked some user-friendly interface for todos management and there was no plugin available for that. If you find any bugs, you are welcome to fork this repo or open a Pull Request.

