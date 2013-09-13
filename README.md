### Todo Lists for Redmine

This is a quick implementation of basecamp-like to-do lists. Every to-do item is an "Issue" behind the scenes - this way you can track everything in the "Issues" tab, discuss, upload files, and so on.

### Installation

1. Clone this repo to plugins/ directory (so all files are in plugins/redmine_todos)
1. Run rake redmine:plugins:migrate.
1. Configure the plugin in settings > plugins
1. Setup per-role permissions in settings > roles (this plugin comes with multiple new types of permissions)

### Features

* To-do lists management
* Very friendly UI (heavily inspired by basecamp) - enter to-dos (=create issues) like: type, enter, type, enter
* Reordering todo items and todo lists
* Updating issue affects related to-do item (status and subject updates)
* Access management

### Notes

* 0% test coverage
* Works only with PostgreSQL (and probably SQL server - window clause is used)
* I tested it only under firefox 23 and chrome 28 - it probably won't work well with IE (especially that angular.js is involved and no compability changes were performed)

### Disclaimer

I use a local redmine installation to keep things organized. I created this plugin for myself, but I thought it might be useful for someone somewhere.

By no means I am a rails programmer - this is the first piece of ruby code I wrote in my life and there are probably some horrible mistakes in there. I did it only because I desperately lacked some user-friendly interface for todos management and there was no plugin available for that. If you find any bugs, you are welcome to fork this repo or open a Pull Request.

