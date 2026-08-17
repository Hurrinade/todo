import { ArrowLeft } from "lucide-react";

import { TodoDetailTitle } from "@/components/todo/TodoDetailTitle";
import { TodoNoteEditor } from "@/components/todo/TodoNoteEditor";
import { Button } from "@/components/ui/button";
import type { TodoDetailViewProps } from "@/types";

export function TodoDetailView({
  detail,
  errorMessage,
  onBack,
  onRenameTodo,
  onUpdateDescription,
}: TodoDetailViewProps) {
  const { todo, list } = detail;

  return (
    <main className="h-full w-full overflow-y-auto bg-background text-foreground">
      <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-5 px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-6 sm:pt-6 sm:pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <header className="flex min-w-0 items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="mobile-lg"
            onClick={onBack}
            aria-label="Back to todo workspace"
            className="flex items-center gap-2 w-fit px-2"
          >
            <ArrowLeft className="size-5" />
            <span className="flex items-center gap-2 text-sm font-semibold">
              {list.emoji ? (
                <span
                  aria-hidden="true"
                  className="shrink-0 text-base leading-none"
                >
                  {list.emoji}
                </span>
              ) : null}
              <span className="block truncate">{list.title}</span>
            </span>
          </Button>
        </header>

        {errorMessage ? (
          <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </div>
        ) : null}

        <section className="flex min-w-0 flex-1 flex-col gap-8 px-1 py-2 sm:px-2">
          <TodoDetailTitle
            key={`${todo._id}-${JSON.stringify(todo.title)}`}
            todo={todo}
            onRenameTodo={onRenameTodo}
          />

          <div className="flex min-w-0 flex-col gap-2.5 border-t pt-5">
            <label
              htmlFor="todo-description"
              className="text-sm font-medium text-muted-foreground"
            >
              Note
            </label>
            <TodoNoteEditor
              key={`${todo._id}-${JSON.stringify(todo.description ?? null)}`}
              description={todo.description}
              onUpdateDescription={onUpdateDescription}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
