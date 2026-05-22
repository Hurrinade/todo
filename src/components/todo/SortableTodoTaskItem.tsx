import { useSortable } from "@dnd-kit/react/sortable";
import { useState } from "react";

import {
  TodoTaskItem,
  type TodoTaskItemProps,
} from "@/components/todo/TodoTaskItem";
import { cn } from "@/lib/utils";

type SortableTodoTaskItemProps = TodoTaskItemProps & {
  index: number;
  group?: string;
  isReorderEnabled: boolean;
};

export function SortableTodoTaskItem({
  index,
  group,
  isReorderEnabled,
  todo,
  onToggleTodo,
  onRenameTodo,
  onDeleteTodo,
}: SortableTodoTaskItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const { ref, handleRef, isDragging } = useSortable({
    id: todo._id,
    index,
    group,
    type: "todo",
    data: {
      type: "todo",
      todoId: todo._id,
      sectionId: todo.sectionId,
      isCompleted: todo.isCompleted,
    },
    disabled: !isReorderEnabled || isEditing,
  });

  return (
    <li
      ref={ref}
      tabIndex={isReorderEnabled && !isEditing ? 0 : undefined}
      className={cn(
        "rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
        isDragging && "relative z-20 shadow-lg shadow-background/25",
      )}
    >
      <TodoTaskItem
        todo={todo}
        onToggleTodo={onToggleTodo}
        onRenameTodo={onRenameTodo}
        onDeleteTodo={onDeleteTodo}
        onEditingChange={setIsEditing}
        dragHandleRef={handleRef}
        isReorderEnabled={isReorderEnabled}
      />
    </li>
  );
}
