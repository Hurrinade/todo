import { useSortable } from "@dnd-kit/react/sortable";

import {
  TodoTaskItem,
  type TodoTaskItemProps,
} from "@/components/todo/TodoTaskItem";
import { TodoTaskMotionItem } from "@/components/todo/TodoTaskMotionItem";
import { useNetworkStore } from "@/stores";

type SortableTodoTaskItemProps = TodoTaskItemProps & {
  index: number;
  group?: string;
  isReorderEnabled: boolean;
  useMotionWrapper?: boolean;
};

export function SortableTodoTaskItem({
  index,
  group,
  isReorderEnabled,
  useMotionWrapper = true,
  todo,
  onToggleTodo,
  onDeleteTodo,
}: SortableTodoTaskItemProps) {
  const isOnline = useNetworkStore((state) => state.isOnline);
  const canReorder = isOnline && isReorderEnabled;
  const { ref, handleRef } = useSortable({
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
    disabled: !canReorder,
  });

  const taskItem = (
    <TodoTaskItem
      todo={todo}
      onToggleTodo={onToggleTodo}
      onDeleteTodo={onDeleteTodo}
      dragHandleRef={handleRef}
      isReorderEnabled={canReorder}
    />
  );

  if (!useMotionWrapper) {
    return (
      <div
        ref={ref}
        role="listitem"
        tabIndex={canReorder ? 0 : undefined}
        className="relative z-50 rounded-lg"
      >
        {taskItem}
      </div>
    );
  }

  return (
    <TodoTaskMotionItem
      ref={ref}
      todoId={todo._id}
      tabIndex={canReorder ? 0 : undefined}
    >
      {taskItem}
    </TodoTaskMotionItem>
  );
}
