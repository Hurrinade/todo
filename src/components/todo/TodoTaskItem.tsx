import { CheckCircle2, Circle, GripVertical, Trash2 } from "lucide-react";
import { useRef, useState } from "react";

import { SwipeAction } from "@/components/common/SwipeAction";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TodoItem } from "@/types";

export type TodoTaskItemProps = {
  todo: TodoItem;
  onToggleTodo: (todoId: TodoItem["_id"]) => void;
  onRenameTodo: (todoId: TodoItem["_id"], title: string) => Promise<void>;
  onDeleteTodo: (todoId: TodoItem["_id"]) => void;
  onEditingChange?: (isEditing: boolean) => void;
  dragHandleRef?: (element: Element | null) => void;
  isReorderEnabled?: boolean;
};

export function TodoTaskItem({
  todo,
  onToggleTodo,
  onRenameTodo,
  onDeleteTodo,
  onEditingChange,
  dragHandleRef,
  isReorderEnabled = false,
}: TodoTaskItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(todo.title);
  const [isSaving, setIsSaving] = useState(false);
  const shouldSkipBlurSaveRef = useRef(false);

  const closeEdit = () => {
    setIsEditing(false);
    onEditingChange?.(false);
  };

  const handleEdit = () => {
    shouldSkipBlurSaveRef.current = false;
    setDraftTitle(todo.title);
    setIsEditing(true);
    onEditingChange?.(true);
  };

  const handleBlur = async () => {
    if (shouldSkipBlurSaveRef.current) {
      shouldSkipBlurSaveRef.current = false;
      return;
    }

    const nextTitle = draftTitle.trim();

    if (!nextTitle || nextTitle === todo.title) {
      setDraftTitle(todo.title);
      closeEdit();
      return;
    }

    setIsSaving(true);

    try {
      await onRenameTodo(todo._id, nextTitle);
      closeEdit();
    } catch {
      // The parent mutation handler owns user-facing error state.
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    shouldSkipBlurSaveRef.current = true;
    setDraftTitle(todo.title);
    closeEdit();
  };

  if (isEditing) {
    return (
      <div className="rounded-lg bg-card p-2">
        <Input
          aria-label="Todo title"
          autoFocus
          disabled={isSaving}
          value={draftTitle}
          onBlur={() => {
            void handleBlur();
          }}
          onChange={(event) => {
            setDraftTitle(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              event.currentTarget.blur();
              return;
            }

            if (event.key === "Escape") {
              event.preventDefault();
              handleCancel();
            }
          }}
          className="min-w-0 flex-1 px-3 py-2"
        />
      </div>
    );
  }

  return (
    <SwipeAction
      actions={
        <Button
          type="button"
          size="icon"
          variant="ghost"
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
      contentClassName="p-2"
      ariaLabel="Todo actions"
    >
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Reorder todo"
          disabled={!isReorderEnabled}
          className="mt-0.5 shrink-0 cursor-grab text-muted-foreground hover:text-foreground disabled:cursor-default disabled:opacity-45"
          ref={(element) => {
            dragHandleRef?.(element);
          }}
        >
          <GripVertical className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={(e) => {
            e.stopPropagation();
            onToggleTodo(todo._id);
          }}
          className="mt-0.5 text-muted-foreground hover:text-primary"
          aria-label={todo.isCompleted ? "Mark todo open" : "Complete todo"}
        >
          {todo.isCompleted ? (
            <CheckCircle2 className="size-5 text-success" />
          ) : (
            <Circle className="size-5" />
          )}
        </Button>

        <button
          type="button"
          onClick={handleEdit}
          className="min-w-0 flex-1 rounded-md bg-transparent p-0 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
          aria-label="Edit todo title"
        >
          <p
            className={
              "wrap-break-word text-md font-medium " +
              (todo.isCompleted
                ? "text-muted-foreground line-through"
                : "text-foreground")
            }
          >
            {todo.title}
          </p>
        </button>
      </div>
    </SwipeAction>
  );
}
