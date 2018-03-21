class TodoItemController < ApplicationController
  unloadable

  before_filter :find_project
  before_filter :check_permissions
  before_filter :find_todo_list, :only => :create
  before_filter :find_todo_item, :only => [:toggle, :update, :delete]
  before_filter :init_journal

  def create
    (render_403; return false) unless User.current.allowed_to?(:create_todos, @project)

    settings = Setting[:plugin_redmine_todos]

    if not settings.include? :default_tracker
      settings[:default_tracker] = false
    end

    begin
      tracker = @project.trackers.find((params && params[:tracker_id]) || settings[:default_tracker] || :first)
    rescue ActiveRecord::RecordNotFound
      return render :status=>500, :json => {:success => false, :message => l(:error_no_tracker_in_project_or_plugin) }
    end
    (return render :status=>500, :json => {:success => false, :message => l(:label_insufficient_permissions) } ; return false) unless User.current.allowed_to?(:create_todos, @project)

    @issue = Issue.new(
        :author_id => User.current.id,
        :subject => params[:subject_new],
        :status_id => settings[:uncompleted_todo_status],
        :due_date => params[:due_date_new],
        :is_private => (params[:is_private] || false) ? 1 : 0,
        :assigned_to_id => params[:assigned_to_id_new]
    )
    # Refactored that out of the above call because of issue #8:
    # https://github.com/AZielinski/Redmine-Todo-lists/issues/8
    @issue.project = @project
    @issue.tracker = tracker

    # If user input started from # try to substitute by an existing issue
    if @issue.subject.start_with?('#') == true
      issue_id_str = @issue.subject.dup
      issue_id_str[0]=''
      issue_id = issue_id_str.to_i
      if issue_id.to_s == issue_id_str
        issue_try = Issue.visible.where(:id => issue_id).first
        unless issue_try.nil?
          @issue = issue_try
        end
      end
    end
    
    todo_item = TodoItem.new(:todo_list_id=> @todo_list.id)
    success = self.do_save(todo_item, @issue)
    render :json => {:success => success}.merge(todo_item.as_json)
  end

  def update
    (render_403; return false) unless User.current.allowed_to?(:update_todos, @project)
    if params[:saveMode]
      if params[:saveMode] == "name"
        @todo_item.issue.subject = params[:subject_new]
      elsif params[:saveMode] == "due_assignee"
        if params.include? :assigned_to_id_new
          @todo_item.issue.assigned_to_id = params[:assigned_to_id_new]
        end
        if params.include? :due_date_new
          @todo_item.issue.due_date = params[:due_date_new] ? Time.parse(params[:due_date_new]) : nil
        end
        if params.include? :is_private_new
          @todo_item.issue.is_private = (!!params[:is_private_new]) ? 1 : 0
        end
      end
    end
    return render :json => {:success => self.do_save(@todo_item)}.merge(@todo_item.as_json).to_json
  end

  def delete
    (render_403; return false) unless User.current.allowed_to?(:delete_todos, @project)
    @todo_item.delete()
    @todo_item.issue.delete() # Needed for PostgreSQL adapter which does not seem to delete this automatically
    return render :json => {:success => true}.to_json
  end

  def toggle
    (render_403; return false) unless User.current.allowed_to?(:update_todos, @project)

    settings = Setting[:plugin_redmine_todos]
    @todo_item.issue.status_id = params[:completed] ? settings[:completed_todo_status] : settings[:uncompleted_todo_status]
    @todo_item.completed_at = params[:completed] ? Time.now : nil
    return render :json => {
        :success => self.do_save(@todo_item),
        :completed_at => @todo_item.completed_at,
        :status_id => @todo_item.issue.status_id
    }.to_json
  end

  protected

  def do_save(todo_item, issue=nil)
    issue ||= todo_item.issue
    Issue.transaction do
      TodoItem.transaction do
        is_new = issue.id.nil?
        call_hook(is_new ? :controller_issues_new_before_save : :controller_issues_edit_before_save, { :params => params, :issue => issue, :journal => @journal })
        if issue.save!
          call_hook(is_new ? :controller_issues_new_after_save : :controller_issues_edit_after_save, { :params => params, :issue => issue, :journal => @journal })
          if todo_item.id.nil?
            todo_item.issue_id = issue.id
          end
          todo_item.issue = issue
          if todo_item.save!
            return true
          end
        end
      end
    end
    return false
  end

  def find_todo_list
    @todo_list = TodoList.find(params[:todo_list_id])
  end

  def find_todo_item
    @todo_item = TodoItem.includes(:issue).find(params[:id])
    has_perms = @todo_item.user_has_permissions(User.current)
    (render_403; return false) unless has_perms
  end

  def init_journal
    @journal = if @todo_item.nil?
      nil
    else
      @todo_item.issue.init_journal(User.current)
    end
  end

  # This is actually not the same as in the parent class - we are looking for :project_id instead of :id
  def find_project
    @project = Project.find(params[:project_id])
  rescue ActiveRecord::RecordNotFound
    render_404
  end

  def check_permissions
    (render_403; return false) unless User.current.allowed_to? :view_todo_lists, @project
  end

end

