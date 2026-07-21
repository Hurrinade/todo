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
};

export function SortableTodoTaskItem({
  index,
  group,
  isReorderEnabled,
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

  return (
    <TodoTaskMotionItem
      ref={ref}
      todoId={todo._id}
      tabIndex={canReorder ? 0 : undefined}
    >
      <TodoTaskItem
        todo={todo}
        onToggleTodo={onToggleTodo}
        onDeleteTodo={onDeleteTodo}
        dragHandleRef={handleRef}
        isReorderEnabled={canReorder}
      />
    </TodoTaskMotionItem>
  );
}
