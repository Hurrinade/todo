import { DragDropProvider } from "@dnd-kit/react";
import { isSortable } from "@dnd-kit/react/sortable";
import { ClipboardList } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { TodoEmptyState } from "@/components/todo/TodoEmptyState";
import { SortableTodoTaskItem } from "@/components/todo/SortableTodoTaskItem";
import type { TodoFilter, TodoItem } from "@/types";

type TodoTaskListProps = {
  todos: TodoItem[];
  activeFilter: TodoFilter;
  isReorderEnabled: boolean;
  onToggleTodo: (todoId: TodoItem["_id"]) => void;
  onRenameTodo: (todoId: TodoItem["_id"], title: string) => Promise<void>;
  onDeleteTodo: (todoId: TodoItem["_id"]) => void;
  onReorderTodos: (todoIds: TodoItem["_id"][]) => Promise<void>;
};

export function TodoTaskList({
  todos,
  activeFilter,
  isReorderEnabled,
  onToggleTodo,
  onRenameTodo,
  onDeleteTodo,
  onReorderTodos,
}: TodoTaskListProps) {
  const [orderedTodos, setOrderedTodos] = useState(todos);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    if (!isDraggingRef.current) {
      setOrderedTodos(todos);
    }
  }, [todos]);

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
    <DragDropProvider
      onDragStart={() => {
        isDraggingRef.current = true;
      }}
      onDragEnd={(event) => {
        isDraggingRef.current = false;

        if (event.canceled) {
          setOrderedTodos(todos);
          return;
        }

        const { source } = event.operation;

        if (!isReorderEnabled || !isSortable(source)) {
          setOrderedTodos(todos);
          return;
        }

        const { initialIndex, index } = source;

        if (initialIndex === index) {
          setOrderedTodos(todos);
          return;
        }

        const nextTodos = [...orderedTodos];
        const [movedTodo] = nextTodos.splice(initialIndex, 1);

        if (!movedTodo) {
          setOrderedTodos(todos);
          return;
        }

        nextTodos.splice(index, 0, movedTodo);
        setOrderedTodos(nextTodos);

        void onReorderTodos(nextTodos.map((todo) => todo._id)).catch(() => {
          setOrderedTodos(todos);
        });
      }}
    >
      <ul className="flex flex-col gap-2">
        {orderedTodos.map((todo, index) => (
          <SortableTodoTaskItem
            key={todo._id}
            index={index}
            group="regular-list"
            isReorderEnabled={isReorderEnabled}
            todo={todo}
            onToggleTodo={onToggleTodo}
            onRenameTodo={onRenameTodo}
            onDeleteTodo={onDeleteTodo}
          />
        ))}
      </ul>
    </DragDropProvider>
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
