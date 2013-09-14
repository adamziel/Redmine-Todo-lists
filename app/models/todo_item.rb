class TodoItem < ActiveRecord::Base
  unloadable
  belongs_to :todo_list, :polymorphic => false
  has_one    :issue, :primary_key => "issue_id", :foreign_key => "id",  :dependent => :delete
  acts_as_list

  def as_json(options=nil)
    {
        :id => self.id,
        :position => self.position,
        :updated_at => self.updated_at,
        # :name => self.issue.subject,
        :todo_list_id => self.todo_list_id,
        :subject => self.issue.subject,
        :status_id => self.issue.status_id,
        :assigned_to_id => self.issue.assigned_to_id,
        :due_date => self.issue.due_date
    }
  end

end
