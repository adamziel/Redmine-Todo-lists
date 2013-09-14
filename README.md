### Todo Lists for Redmine

This is a quick implementation of basecamp-like to-do lists. Every to-do item is an "Issue" behind the scenes - this way you can track everything in the "Issues" tab: discuss, upload files, and so on.

### Installation

1. Clone this repo to plugins/ directory (so all files are in plugins/redmine_todos)
1. Run rake redmine:plugins:migrate.
1. Configure the plugin in admin > plugins
1. Setup per-role permissions in admin > roles (this plugin comes with multiple new types of permissions)

### Features

* To-do lists management
* Very friendly Ajax UI - heavily inspired by basecamp and created with Angular.js
* Enter To-do items as simple as: type, enter, type, enter
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
* Works with MySQL and PostgreSQL (and _probably_ with SQL server)
* Tested only under firefox 23 and chrome 28 - it probably won't work well with IE (especially that angular.js is involved and no compability changes were performed)
* Info for devs: I noticed that on dev server (WEBrick) managing issues sometimes results with an error 500 (error message points me to some other plugin I have). There are no problems on production server though.

### Disclaimer

I use a local redmine installation to keep things organized. I created this plugin for myself, but I thought it might be useful for someone somewhere.

By no means I am a rails programmer - this is the first piece of ruby code I wrote in my life and there are probably some horrible mistakes in there. I did it only because I desperately lacked some user-friendly interface for todos management and there was no plugin available for that. If you find any bugs, you are welcome to fork this repo or open a Pull Request.

