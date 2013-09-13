# This file is a part of redmine_tags
# redMine plugin, that adds tagging support.
#
# Copyright (c) 2010 Eric Davis
# Copyright (c) 2010 Aleksey V Zapparov AKA ixti
#
# redmine_tags is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# redmine_tags is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with redmine_tags.  If not, see <http://www.gnu.org/licenses/>.

module RedmineTodos
  module Hooks
    class ModelIssueHook < Redmine::Hook::ViewListener
      
      def controller_issues_edit_after_save(context={})
        update_todo_details(context)
      end
      
      def update_todo_details(context)

        settings = Setting[:plugin_redmine_todos]

        params = context[:params]
        if params && params[:issue] && settings.include?(:completed_todo_status)

          issue = context[:issue]
          todo_item = issue.todo_item

          return if todo_item.blank?

          if not todo_item.completed_at.nil? and issue.status_id.to_s != settings[:completed_todo_status]
            todo_item.completed_at = nil
          end
          if todo_item.completed_at.nil? and issue.status_id.to_s == settings[:completed_todo_status]
            todo_item.completed_at = Time.now()
          end
          todo_item.save()
        end
      end

    end
  end
end
