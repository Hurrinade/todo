import { useSortable } from "@dnd-kit/react/sortable";

import {
  TodoTaskItem,
  type TodoTaskItemProps,
} from "@/components/todo/TodoTaskItem";
import { useNetworkStore } from "@/stores";
import { isOptimisticTodo } from "@/utils";

type SortableTodoTaskItemProps = TodoTaskItemProps & {
  index: number;
  group?: string;
  isReorderEnabled: boolean;
  /** Also slide the row when its index changes outside a drag (toggle, add, delete). */
  animateIdleReorder?: boolean;
};

// Matches the previous Motion layout tween (200ms easeOut). dnd-kit animates
// the `translate` property, so it never fights other transforms on the row.
const todoReorderTransition = { duration: 200, easing: "ease-out" };

export function SortableTodoTaskItem({
  index,
  group,
  isReorderEnabled,
  animateIdleReorder = false,
  todo,
  onToggleTodo,
  onDeleteTodo,
}: SortableTodoTaskItemProps) {
  const isOnline = useNetworkStore((state) => state.isOnline);
  const canReorder = isOnline && isReorderEnabled && !isOptimisticTodo(todo);
  const { ref, handleRef } = useSortable({
    id: todo._id,
    index,
    group,
    type: "todo",
    accept: "todo",
    transition: { ...todoReorderTransition, idle: animateIdleReorder },
    data: {
      type: "todo",
      todoId: todo._id,
      sectionId: todo.sectionId,
      isCompleted: todo.isCompleted,
    },
    disabled: !canReorder,
  });

  return (
    <div
      ref={ref}
      role="listitem"
      tabIndex={canReorder ? 0 : undefined}
      className="relative z-50 rounded-lg"
    >
      <TodoTaskItem
        todo={todo}
        onToggleTodo={onToggleTodo}
        onDeleteTodo={onDeleteTodo}
        dragHandleRef={handleRef}
        isReorderEnabled={canReorder}
      />
    </div>
  );
}
