require_dependency 'projects_controller'

module  RedmineTodos
  module  Patches
    module ProjectsControllerPatch
      def self.included(base)
        base.extend(ClassMethods)

        base.send(:include, InstanceMethods)
        base.class_eval do
          before_filter :authorize, :except => [:save_default_tracker, :index, :list, :new, :create, :copy, :archive, :unarchive, :destroy]
        end
      end
    end
    module ClassMethods

    end

    module InstanceMethods
      def save_default_tracker
        @project.default_tracker = params["settings"]['default_tracker']
        @project.save
        flash[:notice] = "Tracker updated successfully"
        redirect_to :back
      end
    end
  end
end


