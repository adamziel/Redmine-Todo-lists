class AddPrivateField < ActiveRecord::Migration
  def change
    change_table :todo_lists do |t|
      t.boolean :is_private, :default => false
    end
  end
end
