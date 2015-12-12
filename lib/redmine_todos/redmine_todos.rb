
require 'redmine_todos/hooks/model_issue_hook'


module RedmineTodos

  def self.settings() Setting[:plugin_redmine_todos].blank? ? {} : Setting[:plugin_redmine_todos] end

end

