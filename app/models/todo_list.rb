class TodoList < ActiveRecord::Base
  unloadable
  belongs_to :author,     :class_name => "User",     :foreign_key => "author_id"
  belongs_to :project,    :class_name => "Project",  :foreign_key => "project_id"
  has_many   :todo_items,
             -> { order 'position' },
             :dependent => :delete_all,
             :foreign_key => :todo_list_id

  acts_as_list
  validates_presence_of :name

  def as_json(options=nil)
    {
        :id => self.id,
        :subject => self.name,
        :is_private => self.is_private
    }
  end

  def user_has_permissions(user)
    return ((self.is_private == false) or (user and (self.author_id == user.id)))
  end

end
