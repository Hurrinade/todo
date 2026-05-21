import { CheckCheck, Eye, EyeClosed, RotateCcw, Trash2 } from "lucide-react";

import { TodoListInviteActions } from "@/components/todo/TodoListInviteActions";
import { TodoSidebarToggle } from "@/components/todo/TodoSidebarToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { TodoFilter, TodoListWithStats } from "@/types";

type TodoListHeaderProps = {
  titleDraft: string;
  isRenaming: boolean;
  completedTodoCount: number;
  list: TodoListWithStats;
  activeFilter: TodoFilter;
  isClearingCompleted?: boolean;
  isUncheckingCompleted?: boolean;
  onClearCompleted: () => void;
  onFilterChange: (filter: TodoFilter) => void;
  onTitleDraftChange: (title: string) => void;
  onRenameList: () => void;
  onUncheckCompleted: () => void;
};

export function TodoListHeader({
  titleDraft,
  list,
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
  const nextFilter = getNextFilter(activeFilter);
  const filterActionLabel = getFilterActionLabel(nextFilter);

  return (
    <header className="w-full border-b border-border bg-card/55 px-4 py-3">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-col gap-2 lg:flex-1 lg:flex-row lg:items-center">
          <div className="flex min-w-0 items-center gap-2 justify-between flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <TodoSidebarToggle placement="floating" />
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  onRenameList();
                }}
              >
                <Input
                  aria-label="Todo list title"
                  value={titleDraft}
                  disabled={isRenaming}
                  onBlur={onRenameList}
                  onChange={(event) => {
                    onTitleDraftChange(event.target.value);
                  }}
                  className="font-semibold min-w-0 flex-1 border-none outline-none focus-visible:ring-0 bg-transparent! text-[18px]! p-0!"
                />
              </form>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <TodoListInviteActions list={list} />
              {shouldShowBulkActions && (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-lg"
                        disabled={
                          completedTodoCount === 0 ||
                          isClearingCompleted ||
                          isUncheckingCompleted
                        }
                        onClick={onUncheckCompleted}
                        aria-label={
                          isUncheckingCompleted
                            ? "Unchecking completed todos"
                            : "Uncheck completed todos"
                        }
                      >
                        <RotateCcw className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={8}>
                      {isUncheckingCompleted
                        ? "Unchecking completed todos"
                        : "Uncheck completed todos"}
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-lg"
                        disabled={
                          completedTodoCount === 0 ||
                          isClearingCompleted ||
                          isUncheckingCompleted
                        }
                        onClick={onClearCompleted}
                        aria-label={
                          isClearingCompleted
                            ? "Clearing completed todos"
                            : "Clear completed todos"
                        }
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={8}>
                      {isClearingCompleted
                        ? "Clearing completed todos"
                        : "Clear completed todos"}
                    </TooltipContent>
                  </Tooltip>
                </>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-lg"
                    onClick={() => {
                      onFilterChange(nextFilter);
                    }}
                    aria-label={filterActionLabel}
                  >
                    {activeFilter === "all" ? (
                      <Eye className="size-4" />
                    ) : activeFilter === "open" ? (
                      <EyeClosed className="size-4" />
                    ) : (
                      <CheckCheck className="size-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent sideOffset={8}>
                  {filterActionLabel}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function getNextFilter(activeFilter: TodoFilter): TodoFilter {
  if (activeFilter === "all") {
    return "open";
  }

  if (activeFilter === "open") {
    return "completed";
  }

  return "all";
}

function getFilterActionLabel(filter: TodoFilter) {
  if (filter === "open") {
    return "Show open items";
  }

  if (filter === "completed") {
    return "Show completed items";
  }

  return "Show all items";
}
