import { CheckCircle2, Circle, GripVertical, Trash2 } from "lucide-react";
import { useNavigate } from "react-router";

import { SwipeAction } from "@/components/common/SwipeAction";
import { Button } from "@/components/ui/button";
import { useNetworkStore } from "@/stores";
import type { TodoListItem } from "@/types";
import { getTodoTitleText } from "@/utils";

export type TodoTaskItemProps = {
  todo: TodoListItem;
  onToggleTodo: (todoId: TodoListItem["_id"]) => void;
  onDeleteTodo: (todoId: TodoListItem["_id"]) => void;
  dragHandleRef?: (element: Element | null) => void;
  isReorderEnabled?: boolean;
};

export function TodoTaskItem({
  todo,
  onToggleTodo,
  onDeleteTodo,
  dragHandleRef,
  isReorderEnabled = false,
}: TodoTaskItemProps) {
  const navigate = useNavigate();
  const isOnline = useNetworkStore((state) => state.isOnline);

  return (
    <SwipeAction
      actions={
        <Button
          type="button"
          size="icon"
          variant="ghost"
          disabled={!isOnline}
          onClick={() => {
            onDeleteTodo(todo._id);
          }}
          aria-label="Delete todo"
          className="h-full flex-1 rounded-none bg-destructive/10 text-destructive hover:bg-destructive/15 hover:text-destructive dark:hover:bg-destructive/25! dark:hover:text-destructive/80!"
        >
          <Trash2 />
        </Button>
      }
      actionWidth={56}
      className="w-full min-w-0 max-w-full"
      contentClassName="md:p-2 p-1"
      ariaLabel="Todo actions"
    >
      <div className="flex w-full min-w-0 max-w-full items-center gap-3 overflow-hidden">
        {isReorderEnabled && (
          <Button
            type="button"
            variant="ghost"
            size="icon-mobile-sm"
            aria-label="Reorder todo"
            data-swipe-ignore
            className="mt-0.5 shrink-0 cursor-grab text-muted-foreground hover:text-foreground disabled:cursor-default disabled:opacity-45"
            ref={(element) => {
              dragHandleRef?.(element);
            }}
          >
            <GripVertical className="size-4" />
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon-mobile-sm"
          disabled={!isOnline}
          onClick={(e) => {
            e.stopPropagation();
            onToggleTodo(todo._id);
          }}
          className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary"
          aria-label={todo.isCompleted ? "Mark todo open" : "Complete todo"}
        >
          {todo.isCompleted ? (
            <CheckCircle2 className="size-5 text-success" />
          ) : (
            <Circle className="size-5" />
          )}
        </Button>

        <div className="flex min-w-0 max-w-full flex-1 items-start gap-1.5 overflow-hidden">
          <button
            type="button"
            onClick={() => {
              navigate(`/home/todos/${todo._id}`, {
                state: { selectedListId: todo.listId },
              });
            }}
            className="min-w-0 max-w-full flex-1 overflow-hidden rounded-md bg-transparent p-0 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
            aria-label="Open todo"
          >
            <p
              className={
                "wrap-break-word whitespace-normal text-md font-medium [word-break:break-word] " +
                (todo.isCompleted
                  ? "text-muted-foreground line-through"
                  : "text-foreground")
              }
            >
              {getTodoTitleText(todo.title)}
            </p>
          </button>
        </div>
      </div>
    </SwipeAction>
  );
}
