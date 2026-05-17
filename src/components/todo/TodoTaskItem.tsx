import {
  Check,
  CheckCircle2,
  Circle,
  Pencil,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";

import { Button } from "@/components/ui/button";
import type { TodoItem } from "@/types";

type TodoTaskItemProps = {
  todo: TodoItem;
  onToggleTodo: (todoId: TodoItem["_id"]) => void;
  onRenameTodo: (todoId: TodoItem["_id"], title: string) => Promise<void>;
  onDeleteTodo: (todoId: TodoItem["_id"], title: string) => void;
};

export function TodoTaskItem({
  todo,
  onToggleTodo,
  onRenameTodo,
  onDeleteTodo,
}: TodoTaskItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(todo.title);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!draftTitle.trim()) {
      return;
    }

    setIsSaving(true);

    try {
      await onRenameTodo(todo._id, draftTitle);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setDraftTitle(todo.title);
    setIsEditing(false);
  };

  return (
    <li className="rounded-lg border border-border bg-card/70 p-3">
      {isEditing ? (
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={handleSubmit}
        >
          <input
            aria-label="Todo title"
            value={draftTitle}
            onChange={(event) => {
              setDraftTitle(event.target.value);
            }}
            className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring focus:ring-3 focus:ring-ring/30"
          />
          <div className="flex gap-2">
            <Button
              type="submit"
              size="icon"
              disabled={isSaving || !draftTitle.trim()}
              aria-label="Save todo"
            >
              <Save />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={handleCancel}
              aria-label="Cancel todo edit"
            >
              <X />
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => {
              onToggleTodo(todo._id);
            }}
            className="mt-0.5 rounded-md text-muted-foreground hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
            aria-label={todo.isCompleted ? "Mark todo open" : "Complete todo"}
          >
            {todo.isCompleted ? (
              <CheckCircle2 className="size-5 text-success" />
            ) : (
              <Circle className="size-5" />
            )}
          </button>

          <div className="min-w-0 flex-1">
            <p
              className={
                "break-words text-sm font-medium " +
                (todo.isCompleted
                  ? "text-muted-foreground line-through"
                  : "text-foreground")
              }
            >
              {todo.title}
            </p>
          </div>

          <div className="flex shrink-0 gap-1">
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              onClick={() => {
                setDraftTitle(todo.title);
                setIsEditing(true);
              }}
              aria-label="Edit todo"
            >
              <Pencil />
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              onClick={() => {
                onToggleTodo(todo._id);
              }}
              aria-label={todo.isCompleted ? "Mark todo open" : "Complete todo"}
            >
              <Check />
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              onClick={() => {
                onDeleteTodo(todo._id, todo.title);
              }}
              aria-label="Delete todo"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 />
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}
