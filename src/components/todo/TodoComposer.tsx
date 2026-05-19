import { Plus } from "lucide-react";
import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type TodoComposerProps = {
  title: string;
  isCreatingTodo: boolean;
  onTitleChange: (title: string) => void;
  onCreateTodo: (event: React.SubmitEvent) => Promise<boolean>;
};

export function TodoComposer({
  title,
  isCreatingTodo,
  onTitleChange,
  onCreateTodo,
}: TodoComposerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <form
      className="flex items-center gap-2 p-2"
      onSubmit={async (event) => {
        const wasCreated = await onCreateTodo(event);

        if (wasCreated) {
          requestAnimationFrame(() => {
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
        className="min-w-0 flex-1 bg-background/80 h-10 py-2"
      />
      <Button
        type="submit"
        disabled={isCreatingTodo || !title.trim()}
        className="h-10"
      >
        <Plus data-icon="inline-start" />
        Add todo
      </Button>
    </form>
  );
}
