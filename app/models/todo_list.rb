class TodoList < ActiveRecord::Base
  unloadable
  belongs_to :author,     :class_name => "User",     :foreign_key => "author_id"
  belongs_to :project,    :class_name => "Project",  :foreign_key => "project_id"
  has_many   :todo_items,
             :dependent => :delete_all,
             :foreign_key => :todo_list_id,
             :order => "todo_items.position"

  acts_as_list
  
  validates_presence_of :name

end
