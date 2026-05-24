import { useSortable } from "@dnd-kit/react/sortable";

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
  onDeleteTodo,
}: SortableTodoTaskItemProps) {
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
    disabled: !isReorderEnabled,
  });

  return (
    <li
      ref={ref}
      tabIndex={isReorderEnabled ? 0 : undefined}
      className={cn(
        "rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
        isDragging && "relative z-20 shadow-lg shadow-background/25",
      )}
    >
      <TodoTaskItem
        todo={todo}
        onToggleTodo={onToggleTodo}
        onDeleteTodo={onDeleteTodo}
        dragHandleRef={handleRef}
        isReorderEnabled={isReorderEnabled}
      />
    </li>
  );
}
