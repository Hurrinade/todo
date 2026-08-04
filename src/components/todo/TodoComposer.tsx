import { Plus } from "lucide-react";
import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type TodoComposerProps = {
  title: string;
  isCreatingTodo: boolean;
  isOnline: boolean;
  onTitleChange: (title: string) => void;
  onCreateTodo: (event: React.SubmitEvent) => Promise<boolean>;
  onCreateSuccess?: () => void;
};

export function TodoComposer({
  title,
  isCreatingTodo,
  isOnline,
  onTitleChange,
  onCreateTodo,
  onCreateSuccess,
}: TodoComposerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <form
      className="flex items-center gap-2 p-2"
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
      <Input
        ref={inputRef}
        aria-label="New todo title"
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
        disabled={!isOnline || isCreatingTodo || !title.trim()}
        className="rounded-full bg-card text-muted-foreground"
        aria-label={isOnline ? "Add todo" : "Reconnect to add todo"}
      >
        <Plus />
      </Button>
    </form>
  );
}
