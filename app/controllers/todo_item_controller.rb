class TodoItemController < ApplicationController
  unloadable

  before_filter :find_todo_list, :only => :create
  before_filter :find_todo_item, :only => [:toggle, :update, :delete]
  before_filter :find_project

  def create
    (render_403; return false) unless User.current.allowed_to?(:create_todos, @project)

    settings = Setting[:plugin_redmine_todos]

    @issue = Issue.create(:author_id=>User.current.id, :subject=>params[:name], :status_id=>settings[:uncompleted_todo_status])
    @issue.project = @project
    @issue.tracker ||= @project.trackers.find((params[:issue] && params[:issue][:tracker_id]) || params[:tracker_id] || :first)
    if @issue.tracker.nil?
      render_error l(:error_no_tracker_in_project)
      return false
    end
    call_hook(:controller_issues_new_before_save, { :params => params, :issue => @issue })
    if @issue.save
      call_hook(:controller_issues_new_after_save,  { :params => params, :issue => @issue})

      item = TodoItem.create(:todo_list_id=> @todo_list.id, :issue_id=> @issue.id)
      if item.save()
        return render :json => {:success => true, :name => params[:name]}
                                    .merge(item.as_json)
                                    .to_json
      end
    end
    render :json => {:success => false }
  end

  def update
    (render_403; return false) unless User.current.allowed_to?(:update_todos, @project)
    @todo_item.issue.subject = params[:name]
    return render :json => {:success => @todo_item.issue.save()}.merge(@todo_item.as_json).to_json
  end

  def delete
    (render_403; return false) unless User.current.allowed_to?(:delete_todos, @project)
    @todo_item.issue.delete()
    @todo_item.delete()
    return render :json => {:success => true}.to_json
  end

  def toggle
    (render_403; return false) unless User.current.allowed_to?(:update_todos, @project)

    settings = Setting[:plugin_redmine_todos]
    @todo_item.issue.status_id = params[:completed] ? settings[:completed_todo_status] : settings[:uncompleted_todo_status]
    @todo_item.completed_at = params[:completed] ? Time.now : nil
    call_hook(:controller_issues_edit_before_save, { :params => params, :issue => @todo_item.issue })
    TodoList.transaction do
      @todo_item.issue.save!
      @todo_item.save!
    end
    call_hook(:controller_issues_edit_after_save, { :params => params, :issue => @todo_item.issue })
    return render :json => {:success => true, :completed_at => @todo_item.completed_at }.to_json
  end

  private

  def find_todo_list
    @todo_list = TodoList.find(params[:todo_list_id])
  end

  def find_todo_item
    @todo_item = TodoItem.find(params[:id])
  end

  def find_project
    @project = Project.find(params[:project_id])
  end
  
end
