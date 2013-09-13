class CreateTodoLists < ActiveRecord::Migration
  def change
    create_table :todo_lists do |t|
      t.string :name
      t.integer :position, :default => 1
      t.datetime :updated_at, :default => 0, :default => Time.now
      t.references :project, :null => false
      t.references :author, :null => false
    end

    create_table :todo_items do |t|
      t.references :issue, :null => false
      t.references :todo_list, :null => false
      t.datetime :updated_at, :default => Time.now
      t.datetime :completed_at, :default => Time.now
      t.integer :position, :default => 1
    end
  end
end
