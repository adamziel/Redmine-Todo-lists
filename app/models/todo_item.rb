class TodoItem < ActiveRecord::Base
  unloadable
  belongs_to :todo_list, :polymorphic => false
  has_one    :issue, :primary_key => "issue_id", :foreign_key => "id"
  acts_as_list

  attr_accessible :todo_list_id

  def as_json(options=nil)
    {
        :id => self.id,
        :position => self.position,
        :updated_at => self.updated_at,
        # :name => self.issue.subject,
        :issue_id => self.issue_id,
        :todo_list_id => self.todo_list_id,
        :subject => self.issue.subject,
        :is_private => self.issue.is_private,
        :status_id => self.issue.status_id,
        :assigned_to_id => self.issue.assigned_to_id,
        :due_date => self.issue.due_date
    }
  end

  def user_has_permissions(user)
    self.todo_list.user_has_permissions(user) and ((self.issue.is_private == false) or (user and (self.issue.author_id == user.id) or (self.issue.assigned_to_id == user.id)))
  end

end
