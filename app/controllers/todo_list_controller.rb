class TodoListController < ApplicationController
  unloadable

  before_filter :find_settings
  before_filter :find_project
  before_filter :check_permissions
  before_filter :find_todo_list, :only => [:done, :update, :delete]

  def index
    if not @settings.include? :completed_todo_status
      @settings[:completed_todo_status] = -1
    end
    # @settings[:completed_todo_status]
    # @settings[:uncompleted_todo_status]
    @assignable_users_json = @project.users.to_json(root: true, :only => [:id, :firstname, :lastname])

    todo_lists = TodoList.where(:project_id=>@project.id)
    .where('todo_lists.is_private = false or todo_lists.author_id = ?', User.current.id)

    if params.key?(:list_id)
      todo_lists = todo_lists.where(:id=>params[:list_id])
    end

    todo_lists = todo_lists.order("todo_lists.position").map do |i|
      a = i.attributes
      a['todo_items'] = []
      a
    end
    todo_lists_ids = todo_lists.map { |tl| tl['id'] }

    TodoItem.joins(:issue)
            .where('issues.status_id != ?', @settings[:completed_todo_status])
            .where('issues.is_private = false or issues.assigned_to_id = ? or issues.author_id = ?', User.current.id, User.current.id)
            .where('todo_items.todo_list_id in (?)', todo_lists_ids)
            .includes(:issue)
            .order('todo_items.position')
            .select('*')
            .each do |item|
              for todo_list in todo_lists
                if todo_list['id'] == item.todo_list_id
                  (todo_list['todo_items'] ||= []) << item.as_json
                  break
                end
              end
            end

    @todo_lists_json = todo_lists.to_json

    @comments_nbs = self.find_comments_nbs
    @recently_completed_json = self.find_recently_completed.to_json

  end

  def create
    (render_403; return false) unless User.current.allowed_to?(:create_todo_lists, @project)

    list = TodoList.create(is_private: (params[:is_private] || false) ? 1 : 0, name: params[:subject_new], project_id: @project.id, author_id: User.current.id)
    list.insert_at 1
    render :json => {:success => true}.merge(list.as_json).to_json
  end

  def update
    (render_403; return false) unless User.current.allowed_to?(:update_todo_lists, @project)

    @todo_list.name = params[:subject_new]
    @todo_list.is_private = (params[:is_private] || false) ? 1 : 0
    render :json => {:success => @todo_list.save()}.merge(@todo_list.as_json)
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

  def check_permissions
    (render_403; return false) unless User.current.allowed_to? :view_todo_lists, @project
  end

  def find_todo_list
    @todo_list = TodoList.where(:id => params[:id], :project_id=>@project.id).first
    has_perms = @todo_list.user_has_permissions(User.current)
    (render_403; return false) unless has_perms
  end

  # This is actually not the same as in the parent class - we are looking for :project_id instead of :id
  def find_project
    @project = Project.find(params[:project_id])
  rescue ActiveRecord::RecordNotFound
    render_404
  end

  def find_settings
    @settings = Setting[:plugin_redmine_todos]
  end

  protected

  def find_comments_nbs
    comments_nbs_rs = ActiveRecord::Base.connection.select_all(
        %{
          select
            todo_items.id,
            (select count(*) from journals where journals.journalized_type = 'Issue' and journals.journalized_id=issues.id and notes != '' and notes is not null) as comments_nbs
          from todo_items
            left join issues on issues.id=todo_items.issue_id
            where issues.project_id = #{TodoItem.sanitize(@project.id)}
        }
    )
    comments_nbs = Hash.new
    comments_nbs_rs.each do |i|
      values = i.kind_of?(Hash) ? i.values : i
      comments_nbs[values[0]] = values[1]
    end
    comments_nbs
  end

  def find_recently_completed
    begin
      wanted_issue_attrs = %w(subject status_id assigned_to_id due_date)
      recently_completed_json = Hash.new{|h,k| h[k] = []}
      if ActiveRecord::Base.connection.instance_values['config'][:adapter].include?('mysql')
        recently_completed = TodoItem.find_by_sql(
            %{
              select * from (
                  select todo_items.*, issues.subject, issues.status_id, issues.assigned_to_id, issues.due_date, (
                            CASE todo_items.todo_list_id
                            WHEN @curTLId THEN @curRow := @curRow + 1
                            ELSE @curRow := 1 AND @curTLId := todo_items.todo_list_id  END
                          ) + 1 AS rank
                  from
                  todo_items
                  join
                  (
                    select @curRow := 0, @curTLId := 0
                  ) r
                  LEFT JOIN issues on issues.id=todo_items.issue_id
                  where issues.status_id = #{TodoItem.sanitize(@settings[:completed_todo_status])}
                  order by todo_items.todo_list_id, completed_at desc
              ) a
              where rank < 4
            }
        )
      elsif ActiveRecord::Base.connection.instance_values['config'][:adapter].include?('postgres')
        recently_completed = TodoItem.find_by_sql(
            %{
              SELECT ranked_items.* FROM
              (
                select todo_items.*, issues.subject, issues.status_id, issues.assigned_to_id, issues.due_date, rank() over (partition by todo_list_id order by updated_at desc)
                from todo_items
                LEFT JOIN issues on issues.id=todo_items.issue_id
                WHERE issues.status_id = #{TodoItem.sanitize(@settings[:completed_todo_status])}
              ) AS ranked_items
              WHERE rank <= 2
              ORDER BY todo_list_id, completed_at desc
            }
        )
      end

      recently_completed.each do |row|
        hash = row.attributes.select do |key, value|
          %w(id position todo_list_id completed_at issue_id).include? key
        end
        row.attributes.each do |key, value|
          if wanted_issue_attrs.include? key
            hash[key] = value
          end
        end
        recently_completed_json[row.todo_list_id] << hash
      end

      return recently_completed_json
    rescue
      return []
    end
  end

end

