import { Pencil, RotateCcw, Save, Trash2 } from "lucide-react";

import { TodoFilterTabs } from "@/components/todo/TodoFilterTabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TodoFilter, TodoListWithStats } from "@/types";

type TodoListHeaderProps = {
  titleDraft: string;
  canSave: boolean;
  isRenaming: boolean;
  completedTodoCount: number;
  list: TodoListWithStats;
  activeFilter: TodoFilter;
  isClearingCompleted?: boolean;
  isUncheckingCompleted?: boolean;
  onClearCompleted: () => void;
  onFilterChange: (filter: TodoFilter) => void;
  onTitleDraftChange: (title: string) => void;
  onRenameList: (event: React.SubmitEvent) => void;
  onUncheckCompleted: () => void;
};

export function TodoListHeader({
  titleDraft,
  list,
  canSave,
  isRenaming,
  completedTodoCount,
  isClearingCompleted = false,
  isUncheckingCompleted = false,
  onClearCompleted,
  onTitleDraftChange,
  onRenameList,
  activeFilter,
  onFilterChange,
  onUncheckCompleted,
}: TodoListHeaderProps) {
  const shouldShowBulkActions = activeFilter !== "open";

  return (
    <header className="flex w-full items-center justify-between gap-4 border-b border-border bg-card/55 px-4 py-2 flex-wrap">
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
      <div className="flex w-full flex-col items-stretch gap-3 md:w-auto md:items-end">
        {shouldShowBulkActions ? (
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={
                completedTodoCount === 0 ||
                isClearingCompleted ||
                isUncheckingCompleted
              }
              onClick={onUncheckCompleted}
              className="w-full sm:w-auto"
            >
              <RotateCcw data-icon="inline-start" />
              {isUncheckingCompleted ? "Unchecking..." : "Uncheck completed"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={
                completedTodoCount === 0 ||
                isClearingCompleted ||
                isUncheckingCompleted
              }
              onClick={onClearCompleted}
              className="w-full text-destructive hover:text-destructive sm:w-auto"
            >
              <Trash2 data-icon="inline-start" />
              {isClearingCompleted ? "Clearing..." : "Clear completed"}
            </Button>
          </div>
        ) : null}
        <TodoFilterTabs
          list={list}
          activeFilter={activeFilter}
          onFilterChange={onFilterChange}
        />
      </div>
    </header>
  );
}
