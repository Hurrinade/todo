import { ListChecks, Plus } from "lucide-react";
import type { FormEvent } from "react";

import { Button } from "@/components/ui/button";
import type { TodoListWithStats } from "@/types";

type TodoListSidebarProps = {
  lists: TodoListWithStats[];
  activeListId: TodoListWithStats["_id"] | null;
  newListTitle: string;
  isCreatingList: boolean;
  onNewListTitleChange: (title: string) => void;
  onCreateList: (event: FormEvent<HTMLFormElement>) => void;
  onSelectList: (listId: TodoListWithStats["_id"]) => void;
};

export function TodoListSidebar({
  lists,
  activeListId,
  newListTitle,
  isCreatingList,
  onNewListTitleChange,
  onCreateList,
  onSelectList,
}: TodoListSidebarProps) {
  return (
    <aside className="flex min-h-0 flex-col gap-4 border-b border-border bg-card/80 p-4 lg:w-80 lg:border-r lg:border-b-0">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.22em] text-primary uppercase">
            Lists
          </p>
          <h2 className="mt-1 text-lg font-semibold text-card-foreground">
            Your boards
          </h2>
        </div>
        <div className="rounded-lg border border-border bg-background px-2 py-1 text-xs text-muted-foreground">
          {lists.length}
        </div>
      </div>

      <form className="flex gap-2" onSubmit={onCreateList}>
        <input
          aria-label="New list title"
          value={newListTitle}
          onChange={(event) => {
            onNewListTitleChange(event.target.value);
          }}
          placeholder="New list"
          className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-3 focus:ring-ring/30"
        />
        <Button
          type="submit"
          size="icon"
          disabled={isCreatingList || !newListTitle.trim()}
          aria-label="Create list"
        >
          <Plus />
        </Button>
      </form>

      <div className="flex min-h-0 gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-y-auto lg:pr-1">
        {lists.length === 0 ? (
          <div className="flex min-w-60 items-center gap-3 rounded-lg border border-dashed border-border bg-background/35 p-3 text-sm text-muted-foreground lg:min-w-0">
            <ListChecks className="size-4 text-primary" />
            Create your first list.
          </div>
        ) : (
          lists.map((list) => {
            const isActive = list._id === activeListId;

            return (
              <button
                key={list._id}
                type="button"
                onClick={() => {
                  onSelectList(list._id);
                }}
                className={
                  "min-w-64 rounded-lg border p-3 text-left lg:min-w-0 " +
                  (isActive
                    ? "border-primary bg-primary/15 text-foreground"
                    : "border-border bg-background/45 text-muted-foreground hover:border-primary/60 hover:text-foreground")
                }
              >
                <span className="block truncate text-sm font-semibold">
                  {list.title}
                </span>
                <span className="mt-2 flex items-center justify-between gap-3 text-xs">
                  <span>{list.openTodoCount} open</span>
                  <span>{list.completedTodoCount} done</span>
                </span>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
