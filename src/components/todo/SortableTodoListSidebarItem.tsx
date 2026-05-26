import { useSortable } from "@dnd-kit/react/sortable";
import { useMutation } from "convex/react";
import { Trash2 } from "lucide-react";
import { useState } from "react";

import { TodoListMembersHoverCard } from "@/components/todo/TodoListMembersHoverCard";
import { Button } from "@/components/ui/button";
import { todoApi } from "@/config/convex-api";
import { useModal } from "@/hooks/modals/use-modal";
import { cn } from "@/lib/utils";
import { useTodoErrorStore } from "@/stores";
import type { TodoListWithStats } from "@/types";

type SortableTodoListSidebarItemProps = {
  index: number;
  isReorderEnabled: boolean;
  list: TodoListWithStats;
  activeListId: TodoListWithStats["_id"] | null;
  setActiveListId: (listId: TodoListWithStats["_id"] | null) => void;
};

export function SortableTodoListSidebarItem({
  index,
  isReorderEnabled,
  list,
  activeListId,
  setActiveListId,
}: SortableTodoListSidebarItemProps) {
  const { openModal } = useModal();
  const deleteList = useMutation(todoApi.mutations.todoLists.remove);
  const clearErrorMessage = useTodoErrorStore(
    (state) => state.clearErrorMessage,
  );
  const setUnknownErrorMessage = useTodoErrorStore(
    (state) => state.setUnknownErrorMessage,
  );
  const [isDeletingList, setIsDeletingList] = useState(false);
  const { ref, isDragging } = useSortable({
    id: list._id,
    index,
    disabled: !isReorderEnabled,
  });
  const isActive = list._id === activeListId;

  const handleDeleteList = () => {
    openModal("confirm", {
      title: "Delete todo list",
      message: `Delete "${list.title}" and every todo inside it?`,
      confirmText: "Delete list",
      cancelText: "Keep list",
      variant: "danger",
      onConfirm: async () => {
        setIsDeletingList(true);
        clearErrorMessage();

        try {
          await deleteList({ listId: list._id });

          if (activeListId === list._id) {
            setActiveListId(null);
          }
        } catch (error) {
          setUnknownErrorMessage(error);
          throw error;
        } finally {
          setIsDeletingList(false);
        }
      },
    });
  };

  return (
    <li
      ref={ref}
      data-slot="sidebar-menu-item"
      data-sidebar="menu-item"
      tabIndex={isReorderEnabled ? 0 : undefined}
      onClick={() => {
        setActiveListId(list._id);
        clearErrorMessage();
      }}
      className={cn(
        "group/menu-item relative flex h-auto items-center justify-between gap-2 py-1 pr-2 pl-3",
        isActive
          ? "border-sidebar-primary bg-sidebar-primary/15 text-sidebar-foreground"
          : "border-sidebar-border bg-transparenttext-muted-foreground hover:border-sidebar-primary/60",
        isDragging && "z-20 shadow-lg shadow-background/25",
      )}
    >
      <span className="flex min-w-0 flex-1 items-center gap-2 text-sm font-semibold">
        {list.emoji ? (
          <span aria-hidden="true" className="shrink-0 text-base leading-none">
            {list.emoji}
          </span>
        ) : null}
        <span className="block min-w-0 flex-1 truncate">{list.title}</span>
      </span>
      {list.members.length > 0 && (
        <TodoListMembersHoverCard members={list.members} />
      )}
      <Button
        variant="ghost"
        aria-label={`Delete ${list.title}`}
        className="cursor-pointer"
        size="icon-sm"
        disabled={isDeletingList}
        onClick={(event) => {
          event.stopPropagation();
          handleDeleteList();
        }}
      >
        <Trash2 className="size-4" />
      </Button>
    </li>
  );
}
