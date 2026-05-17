import { Pencil, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TodoFilter, TodoListWithStats } from "@/types/todo/todo.types";
import { TodoFilterTabs } from "./TodoFilterTabs";

type TodoListHeaderProps = {
  titleDraft: string;
  canSave: boolean;
  isRenaming: boolean;
  list: TodoListWithStats;
  activeFilter: TodoFilter;
  onFilterChange: (filter: TodoFilter) => void;
  onTitleDraftChange: (title: string) => void;
  onRenameList: (event: React.SubmitEvent) => void;
};

export function TodoListHeader({
  titleDraft,
  list,
  canSave,
  isRenaming,
  onTitleDraftChange,
  onRenameList,
  activeFilter,
  onFilterChange,
}: TodoListHeaderProps) {
  return (
    <header className="flex w-full justify-between items-center gap-4 border-b border-border bg-card/55 px-4 py-2 flex-wrap">
      <div className="min-w-0 space-y-3 w-full md:w-fit">
        <form
          className="flex max-w-3xl flex-col gap-2 sm:flex-row"
          onSubmit={onRenameList}
        >
          <Input
            aria-label="Todo list title"
            value={titleDraft}
            onChange={(event) => {
              onTitleDraftChange(event.target.value);
            }}
            className="h-auto min-w-0 flex-1 border-transparent bg-transparent px-4 py-2 text-xl leading-tight font-semibold focus-visible:bg-background focus-visible:px-3 text-center"
          />
          {canSave ? (
            <Button
              type="submit"
              variant="outline"
              disabled={isRenaming || !titleDraft.trim()}
              className="w-full sm:w-auto"
            >
              {isRenaming ? (
                <Pencil data-icon="inline-start" />
              ) : (
                <Save data-icon="inline-start" />
              )}
              Save
            </Button>
          ) : null}
        </form>
      </div>
      <TodoFilterTabs
        list={list}
        activeFilter={activeFilter}
        onFilterChange={onFilterChange}
      />
    </header>
  );
}
