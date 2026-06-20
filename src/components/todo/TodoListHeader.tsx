import { RotateCcw, Trash2 } from "lucide-react";

import { useMutation } from "convex/react";
import { TodoListInviteActions } from "@/components/todo/TodoListInviteActions";
import { TodoSidebarToggle } from "@/components/todo/TodoSidebarToggle";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { TodoListWithStats } from "@/types";
import { useState } from "react";
import { todoApi } from "@/config/convex-api";
import { useTodoErrorStore } from "@/stores/todo/todo-error-store";
import { useModal } from "@/hooks/modals/use-modal";

type TodoListHeaderProps = {
  list: TodoListWithStats;
};

export function TodoListHeader({ list }: TodoListHeaderProps) {
  const { openModal } = useModal();

  const uncheckCompletedTodos = useMutation(
    todoApi.mutations.todos.uncheckCompleted,
  );
  const clearCompletedTodos = useMutation(
    todoApi.mutations.todos.clearCompleted,
  );

  const [isLoading, setIsLoading] = useState(false);
  const clearErrorMessage = useTodoErrorStore(
    (state) => state.clearErrorMessage,
  );
  const setUnknownErrorMessage = useTodoErrorStore(
    (state) => state.setUnknownErrorMessage,
  );

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
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <TodoListInviteActions list={list} />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-lg"
                    disabled={list.completedTodoCount === 0 || isLoading}
                    onClick={handleUncheckCompleted}
                    className="bg-card"
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
                    className="text-destructive hover:text-destructive bg-card"
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
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
