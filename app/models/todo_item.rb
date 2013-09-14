class TodoItem < ActiveRecord::Base
  unloadable
  belongs_to :todo_list, :polymorphic => false
  has_one    :issue, :primary_key => "issue_id", :foreign_key => "id",  :dependent => :delete
  acts_as_list

  def as_json(options = nil)
    super (options || {
        :include => :issue => {:only => [:subject, :status_id, :assigned_to_id, :due_date]},
        :only => [:id, :position, :updated_at, :issue_id, :todo_list_id]
    })
  end

end
