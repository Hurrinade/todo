import { Plus } from "lucide-react";
import type { FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type TodoComposerProps = {
  title: string;
  isCreatingTodo: boolean;
  onTitleChange: (title: string) => void;
  onCreateTodo: (event: FormEvent<HTMLFormElement>) => void;
};

export function TodoComposer({
  title,
  isCreatingTodo,
  onTitleChange,
  onCreateTodo,
}: TodoComposerProps) {
  return (
    <form
      className="flex flex-col gap-2 rounded-lg border border-border bg-card/55 p-3 sm:flex-row"
      onSubmit={onCreateTodo}
    >
      <Input
        aria-label="New todo title"
        value={title}
        onChange={(event) => {
          onTitleChange(event.target.value);
        }}
        placeholder="Add the next thing"
        className="min-w-0 flex-1 px-3 py-2"
      />
      <Button
        type="submit"
        disabled={isCreatingTodo || !title.trim()}
        className="w-full sm:w-auto"
      >
        <Plus data-icon="inline-start" />
        Add todo
      </Button>
    </form>
  );
}
