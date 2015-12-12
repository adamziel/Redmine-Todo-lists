class AddDefaultTrackerToProject < ActiveRecord::Migration
  def change
    add_column :projects, :default_tracker, :string, :default => ""
  end
end