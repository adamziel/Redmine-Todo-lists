class TodoListController < ApplicationController
  unloadable

  before_filter :find_settings
  before_filter :find_project
  before_filter :find_todo_list, :only => [:done, :update, :delete]

  def index
    # @settings[:completed_todo_status]
    # @settings[:uncompleted_todo_status]
    todo_lists = TodoList.where(:project_id=>@project.id).order("todo_lists.position").map do |i|
      a = i.attributes
      a['todo_items'] = []
      a
    end
    todo_lists_ids = todo_lists.map { |tl| tl['id'] }
    TodoItem.where('issues.status_id != ?', @settings[:completed_todo_status])
            .where('todo_items.todo_list_id in (?)', todo_lists_ids)
            .includes(:issue)
            .order('todo_items.position')
            .each do |item|
                for todo_list in todo_lists
                  if todo_list['id'] == item.todo_list_id
                    attrs = item.attributes
                    attrs['issue'] = item.issue.attributes.select { |key, value| ['id', 'subject'].include? key }
                    (todo_list['todo_items'] ||= []) << attrs
                    break
                  end
                end
            end
    @todo_lists_json = todo_lists.to_json

    @recently_completed_json = Hash.new{|h,k| h[k] = []}
    TodoItem.find_by_sql(
        %{
        SELECT ranked_items.* FROM
        (
          select todo_items.*, issues.subject, issues.status_id, rank() over (partition by todo_list_id order by updated_at desc)
          from todo_items
          LEFT JOIN issues on issues.id=todo_items.issue_id
          WHERE issues.status_id = #{TodoItem.sanitize(@settings[:completed_todo_status])}
        ) AS ranked_items
        WHERE rank <= 2
        ORDER BY todo_list_id, completed_at desc
      }
    ).each do |row|
      hash = row.attributes.select do |key, value|
        %w(id position todo_list_id completed_at).include? key
      end
      hash['issue'] = row.attributes.select do |key, value|
        %w(subject status_id).include? key
      end
      hash['issue']['id'] = row.issue_id
      @recently_completed_json[row.todo_list_id] << hash
    end
    @recently_completed_json = @recently_completed_json.to_json
    # .joins(:todo_items)
  end

  def create
    (render_403; return false) unless User.current.allowed_to?(:create_todo_lists, @project)

    list = TodoList.new(name: params[:name], project_id: @project.id, author_id: User.current.id)
    list.save()
    render :json => {:success => true}.merge(list.attributes).to_json
  end

  def update
    (render_403; return false) unless User.current.allowed_to?(:update_todo_lists, @project)

    @todo_list.name = params[:name]
    render :json => {:success => @todo_list.save()}.merge(@todo_list.attributes)
  end

  def delete
    (render_403; return false) unless User.current.allowed_to?(:delete_todo_lists, @project)

    @todo_list.delete()
    render :json => {:success => true}
  end

  def save_order
    (render_403; return false) unless User.current.allowed_to?(:update_todo_lists, @project)
    TodoList.transaction do
      handled_lists = []
      TodoList.where("id in (?)", params[:lists].keys())
              .where(:project_id=>@project.id).each \
      do |list|
        list.position = params[:lists][list.id.to_s]
        list.save!
        handled_lists.append list.id.to_s
      end

      TodoItem.includes(:todo_list)
              .where("todo_items.id in (?)", params[:items].keys())
              .where(todo_lists: { project_id: @project.id }).each \
      do |item|
        item.position = params[:items][item.id.to_s]
        new_parent_id = params[:items_parents][item.id.to_s].to_s
        if handled_lists.index(new_parent_id) != nil
          item.todo_list_id = new_parent_id
        end
        item.save!
      end
    end
    render :json => {:success => true}
  end

  private

  def find_todo_list
    @todo_list = TodoList.where(:id => params[:id], :project_id=>@project.id).first
  end

  def find_project
    # @project variable must be set before calling the authorize filter
    @project = Project.find(params[:project_id])
  end

  def find_settings
    @settings = Setting[:plugin_redmine_todos]
  end
  
end
