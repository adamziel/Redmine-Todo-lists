module  RedmineTodos
  module  Patches
    module ProjectsHelperPatchTodo
      def self.included(base)
        base.extend(ClassMethods)

        base.send(:include, InstanceMethods)
        base.class_eval do
          unloadable
          alias_method_chain :project_settings_tabs, :new_setting
        end
      end

    end
    module ClassMethods
    end

    module InstanceMethods
      def project_settings_tabs_with_new_setting
        tabs = project_settings_tabs_without_new_setting
        tabs.push({:name => 'Todo', :action => :todo_project, :partial => 'projects/todo', :label => 'label_todo_plural'})
        tabs
      end
    end

  end
end

