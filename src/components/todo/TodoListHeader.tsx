import { CheckCheck, Eye, EyeClosed, RotateCcw, Trash2 } from "lucide-react";

import { useMutation } from "convex/react";
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
import { useState } from "react";
import { todoApi } from "@/config/convex-api";
import { useTodoErrorStore } from "@/stores/todo/todo-error-store";
import { useModal } from "@/hooks/modals/use-modal";

type TodoListHeaderProps = {
  list: TodoListWithStats;
  activeFilter: TodoFilter;
  onFilterChange: (filter: TodoFilter) => void;
};

export function TodoListHeader({
  list,
  activeFilter,
  onFilterChange,
}: TodoListHeaderProps) {
  const { openModal } = useModal();

  const renameList = useMutation(todoApi.mutations.todoLists.rename);
  const uncheckCompletedTodos = useMutation(
    todoApi.mutations.todos.uncheckCompleted,
  );
  const clearCompletedTodos = useMutation(
    todoApi.mutations.todos.clearCompleted,
  );

  const shouldShowBulkActions = activeFilter !== "open";
  const nextFilter = getNextFilter(activeFilter);
  const filterActionLabel = getFilterActionLabel(nextFilter);
  const [isLoading, setIsLoading] = useState(false);
  const clearErrorMessage = useTodoErrorStore(
    (state) => state.clearErrorMessage,
  );
  const setUnknownErrorMessage = useTodoErrorStore(
    (state) => state.setUnknownErrorMessage,
  );
  const [listTitleDraft, setListTitleDraft] = useState<{
    listId: TodoListWithStats["_id"];
    title: string;
  } | null>(null);

  let visibleListTitle = "Untitled list";
  if (listTitleDraft && list && listTitleDraft.listId === list._id) {
    visibleListTitle = listTitleDraft.title;
  } else if (list) {
    visibleListTitle = list.title;
  }

  const normalizedDraftTitle = visibleListTitle.trim();
  const normalizedActiveListTitle = list?.title.trim() ?? "";

  const handleRenameList = async () => {
    if (!list || isLoading) {
      return;
    }

    if (!normalizedDraftTitle) {
      setListTitleDraft(null);
      return;
    }

    if (normalizedDraftTitle === normalizedActiveListTitle) {
      setListTitleDraft(null);
      return;
    }

    setIsLoading(true);
    clearErrorMessage();

    try {
      await renameList({ listId: list._id, title: normalizedDraftTitle });
      setListTitleDraft(null);
    } catch (error) {
      setUnknownErrorMessage(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearCompleted = () => {
    if (!list || list.completedTodoCount === 0) {
      return;
    }

    const completedLabel = list.completedTodoCount === 1 ? "todo" : "todos";

    openModal("confirm", {
      title: "Clear completed todos",
      message: `Delete ${list.completedTodoCount} completed ${completedLabel} from "${list.title}"?`,
      confirmText: "Delete completed",
      cancelText: "Keep todos",
      variant: "danger",
      onConfirm: async () => {
        setIsLoading(true);
        clearErrorMessage();

        try {
          await clearCompletedTodos({ listId: list._id });
        } catch (error) {
          setUnknownErrorMessage(error);
          throw error;
        } finally {
          setIsLoading(false);
        }
      },
    });
  };

  const handleUncheckCompleted = async () => {
    if (list.completedTodoCount === 0) {
      return;
    }

    setIsLoading(true);
    clearErrorMessage();

    try {
      await uncheckCompletedTodos({ listId: list._id });
    } catch (error) {
      setUnknownErrorMessage(error);
    } finally {
      setIsLoading(false);
    }
  };

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
                  handleRenameList();
                }}
              >
                <Input
                  aria-label="Todo list title"
                  value={visibleListTitle}
                  disabled={isLoading}
                  onBlur={handleRenameList}
                  onChange={(event) => {
                    const title = event.target.value;
                    setListTitleDraft({ listId: list._id, title });
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
                        disabled={list.completedTodoCount === 0 || isLoading}
                        onClick={handleUncheckCompleted}
                        aria-label={
                          isLoading
                            ? "Unchecking completed todos"
                            : "Uncheck completed todos"
                        }
                      >
                        <RotateCcw className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={8}>
                      {isLoading
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
                        disabled={list.completedTodoCount === 0 || isLoading}
                        onClick={handleClearCompleted}
                        aria-label={
                          isLoading
                            ? "Clearing completed todos"
                            : "Clear completed todos"
                        }
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={8}>
                      {isLoading
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
