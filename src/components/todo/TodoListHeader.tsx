import { RotateCcw, Trash2, Eye, EyeClosed } from "lucide-react";

import { TodoListInviteActions } from "@/components/todo/TodoListInviteActions";
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

  return (
    <header className="w-full border-b border-border bg-card/55 px-4 py-3">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-col gap-2 lg:flex-1 lg:flex-row lg:items-center">
          <div className="flex min-w-0 items-center gap-2 justify-between flex-1">
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

            <div className="flex shrink-0 items-center gap-2">
              <TodoListInviteActions list={list} />
              {shouldShowBulkActions && (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
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
                        size="icon-sm"
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
                    size="icon-sm"
                    disabled={
                      completedTodoCount === 0 ||
                      isClearingCompleted ||
                      isUncheckingCompleted
                    }
                    onClick={() => {
                      onFilterChange(shouldShowBulkActions ? "open" : "all");
                    }}
                    aria-label={
                      shouldShowBulkActions
                        ? "Hide completed todos"
                        : "Show completed todos"
                    }
                  >
                    {shouldShowBulkActions ? (
                      <Eye className="size-4" />
                    ) : (
                      <EyeClosed className="size-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent sideOffset={8}>
                  {shouldShowBulkActions
                    ? "Hide completed todos"
                    : "Show completed todos"}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
