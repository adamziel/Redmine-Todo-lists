require_dependency 'issue'  

module RedmineTodos
  module Patches    
    
    module IssuePatch
      
      def self.included(base) # :nodoc: 
        base.class_eval do
          has_one :todo_item, :class_name => "TodoItem", :dependent => :destroy
        end  

      end  

    end
  end
end