import { ClipboardList } from "lucide-react";

import { TodoEmptyState } from "@/components/todo/TodoEmptyState";
import { TodoTaskItem } from "@/components/todo/TodoTaskItem";
import type { TodoFilter, TodoItem } from "@/types";

type TodoTaskListProps = {
  todos: TodoItem[];
  activeFilter: TodoFilter;
  onToggleTodo: (todoId: TodoItem["_id"]) => void;
  onRenameTodo: (todoId: TodoItem["_id"], title: string) => Promise<void>;
  onDeleteTodo: (todoId: TodoItem["_id"]) => void;
};

export function TodoTaskList({
  todos,
  activeFilter,
  onToggleTodo,
  onRenameTodo,
  onDeleteTodo,
}: TodoTaskListProps) {
  if (todos.length === 0) {
    return (
      <TodoEmptyState
        icon={ClipboardList}
        title="No todos here"
        description={getEmptyDescription(activeFilter)}
      />
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {todos.map((todo) => (
        <TodoTaskItem
          key={todo._id}
          todo={todo}
          onToggleTodo={onToggleTodo}
          onRenameTodo={onRenameTodo}
          onDeleteTodo={onDeleteTodo}
        />
      ))}
    </ul>
  );
}

function getEmptyDescription(activeFilter: TodoFilter) {
  if (activeFilter === "completed") {
    return "Completed work will land here when you check items off.";
  }

  if (activeFilter === "open") {
    return "There are no open todos in this list right now.";
  }

  return "Add a todo to start shaping this list.";
}
