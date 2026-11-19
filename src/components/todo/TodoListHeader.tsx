import { api } from "@convex/_generated/api";
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
import { useT } from "@/hooks";
import type { TodoListSummary } from "@/types";
import { useState } from "react";
import { useNetworkStore, useTodoErrorStore } from "@/stores";
import { useModal } from "@/hooks/modals/use-modal";

type TodoListHeaderProps = {
  list: TodoListSummary;
};

export function TodoListHeader({ list }: TodoListHeaderProps) {
  const { openModal } = useModal();
  const isOnline = useNetworkStore((state) => state.isOnline);
  const t = useT();

  const uncheckCompletedTodos = useMutation(
    api.mutations.todos.uncheckCompleted,
  );
  const clearCompletedTodos = useMutation(api.mutations.todos.clearCompleted);

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

    openModal("confirm", {
      title: t.lists.clearCompleted,
      message: t.lists.clearCompletedMessage(
        list.completedTodoCount,
        list.title,
      ),
      confirmText: t.lists.clearCompletedConfirm,
      cancelText: t.lists.clearCompletedCancel,
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

  const handleUncheckCompleted = () => {
    if (list.completedTodoCount === 0) {
      return;
    }

    openModal("confirm", {
      title: t.lists.uncheckCompleted,
      message: t.lists.uncheckCompletedMessage(
        list.completedTodoCount,
        list.title,
      ),
      confirmText: t.lists.uncheckCompletedConfirm,
      cancelText: t.lists.uncheckCompletedCancel,
      variant: "secondary",
      onConfirm: async () => {
        setIsLoading(true);
        clearErrorMessage();

        try {
          await uncheckCompletedTodos({ listId: list._id });
        } catch (error) {
          setUnknownErrorMessage(error);
          throw error;
        } finally {
          setIsLoading(false);
        }
      },
    });
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
              {list.kind === "recipe" ? null : (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-mobile-lg"
                        disabled={
                          !isOnline ||
                          list.completedTodoCount === 0 ||
                          isLoading
                        }
                        onClick={handleUncheckCompleted}
                        className="bg-card"
                        aria-label={
                          isLoading
                            ? t.lists.uncheckingCompleted
                            : t.lists.uncheckCompleted
                        }
                      >
                        <RotateCcw className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={8}>
                      {isLoading
                        ? t.lists.uncheckingCompleted
                        : t.lists.uncheckCompleted}
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-mobile-lg"
                        disabled={
                          !isOnline ||
                          list.completedTodoCount === 0 ||
                          isLoading
                        }
                        onClick={handleClearCompleted}
                        aria-label={
                          isLoading
                            ? t.lists.clearingCompleted
                            : t.lists.clearCompleted
                        }
                        className="text-destructive hover:text-destructive bg-card"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={8}>
                      {isLoading
                        ? t.lists.clearingCompleted
                        : t.lists.clearCompleted}
                    </TooltipContent>
                  </Tooltip>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
