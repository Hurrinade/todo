import { Plus } from "lucide-react";
import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { MAX_TODO_TITLE_LENGTH } from "@/utils";

type TodoComposerProps = {
  title: string;
  createError: string | null;
  isCreatingTodo: boolean;
  isOnline: boolean;
  onTitleChange: (title: string) => void;
  onCreateTodo: (event: React.SubmitEvent) => Promise<boolean>;
  onCreateSuccess?: () => void;
};

export function TodoComposer({
  title,
  createError,
  isCreatingTodo,
  isOnline,
  onTitleChange,
  onCreateTodo,
  onCreateSuccess,
}: TodoComposerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const titleLength = title.trim().length;
  const isTitleTooLong = titleLength > MAX_TODO_TITLE_LENGTH;
  const feedback = isTitleTooLong
    ? `Title is too long (${titleLength}/${MAX_TODO_TITLE_LENGTH}).`
    : createError;

  return (
    <form
      className="flex flex-col gap-1 p-2"
      onSubmit={async (event) => {
        const wasCreated = await onCreateTodo(event);

        if (wasCreated) {
          requestAnimationFrame(() => {
            onCreateSuccess?.();
            inputRef.current?.focus();
          });
        }
      }}
    >
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          aria-label="New todo title"
          aria-invalid={isTitleTooLong}
          aria-describedby={
            feedback || titleLength >= 200
              ? "new-todo-title-feedback"
              : undefined
          }
          value={title}
          onChange={(event) => {
            onTitleChange(event.target.value);
          }}
          placeholder="Add the next thing"
          className="h-11 min-w-0 flex-1 py-2 pointer-fine:h-8"
        />
        <Button
          type="submit"
          size="icon-mobile"
          disabled={
            !isOnline || isCreatingTodo || !title.trim() || isTitleTooLong
          }
          className="rounded-full bg-card text-muted-foreground"
          aria-label={isOnline ? "Add todo" : "Reconnect to add todo"}
        >
          <Plus />
        </Button>
      </div>
      {(feedback || titleLength >= 200) && (
        <p
          id="new-todo-title-feedback"
          role={feedback ? "alert" : undefined}
          className={cn(
            "text-xs",
            feedback ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {feedback ?? `${titleLength}/${MAX_TODO_TITLE_LENGTH}`}
        </p>
      )}
    </form>
  );
}
