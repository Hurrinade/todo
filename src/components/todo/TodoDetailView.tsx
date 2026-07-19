import { ArrowLeft } from "lucide-react";

import { TodoDetailTitle } from "@/components/todo/TodoDetailTitle";
import { TodoNoteEditor } from "@/components/todo/TodoNoteEditor";
import { Button } from "@/components/ui/button";
import type { TodoDetailViewProps } from "@/types";
import { useTodoStore } from "@/stores/todo/todo-store";
import { todoApi } from "@/config/convex-api";
import { useQuery } from "convex/react";

export function TodoDetailView({
  todo,
  errorMessage,
  onBack,
  onRenameTodo,
  onUpdateDescription,
}: TodoDetailViewProps) {
  const listsResult = useQuery(todoApi.queries.todoLists.list);
  const storeLists = useTodoStore((state) => state.lists);

  const lists = listsResult ?? storeLists;

  const list = lists.find((l) => l._id === todo.listId);

  return (
    <main className="h-full w-full overflow-y-auto bg-background text-foreground">
      <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-5 px-4 py-4 sm:px-6 sm:py-6">
        <header className="flex min-w-0 items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            onClick={onBack}
            aria-label="Back to todo workspace"
            className="flex items-center gap-2 w-fit px-2"
          >
            <ArrowLeft className="size-5" />
            {list && (
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
            )}
          </Button>
        </header>

        {errorMessage ? (
          <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </div>
        ) : null}

        <section className="flex min-w-0 flex-1 flex-col gap-8 px-1 py-2 sm:px-2">
          <TodoDetailTitle todo={todo} onRenameTodo={onRenameTodo} />

          <div className="flex min-w-0 flex-1 flex-col gap-3 border-t pt-4">
            <label
              htmlFor="todo-description"
              className="text-md font-medium text-muted-foreground"
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
