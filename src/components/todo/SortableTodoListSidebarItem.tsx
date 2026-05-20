import { useSortable } from "@dnd-kit/react/sortable";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TodoListWithStats } from "@/types";
import { TodoListMembersHoverCard } from "./TodoListMembersHoverCard";

type SortableTodoListSidebarItemProps = {
  index: number;
  isActive: boolean;
  isReorderEnabled: boolean;
  list: TodoListWithStats;
  onDeleteList: (list: TodoListWithStats) => void;
  onSelectList: (listId: TodoListWithStats["_id"]) => void;
};

export function SortableTodoListSidebarItem({
  index,
  isActive,
  isReorderEnabled,
  list,
  onDeleteList,
  onSelectList,
}: SortableTodoListSidebarItemProps) {
  const { ref, isDragging } = useSortable({
    id: list._id,
    index,
    disabled: !isReorderEnabled,
  });

  return (
    <li
      ref={ref}
      data-slot="sidebar-menu-item"
      data-sidebar="menu-item"
      tabIndex={isReorderEnabled ? 0 : undefined}
      onClick={() => {
        onSelectList(list._id);
      }}
      className={cn(
        "group/menu-item relative flex h-auto items-center justify-between gap-2 rounded-lg border py-1 pr-2 pl-3",
        isReorderEnabled
          ? "cursor-grab active:cursor-grabbing"
          : "cursor-pointer",
        isActive
          ? "border-sidebar-primary bg-sidebar-primary/15 text-sidebar-foreground"
          : "border-sidebar-border bg-background/45 text-muted-foreground hover:border-sidebar-primary/60",
        isDragging && "z-20 shadow-lg shadow-background/25",
      )}
    >
      <span className="block min-w-0 flex-1 truncate text-sm font-semibold">
        {list.title}
      </span>
      {list.members.length > 0 && (
        <TodoListMembersHoverCard members={list.members} />
      )}
      <Button
        variant="ghost"
        aria-label={`Delete ${list.title}`}
        className="cursor-pointer"
        size="icon-sm"
        onClick={(event) => {
          event.stopPropagation();
          onDeleteList(list);
        }}
      >
        <Trash2 className="size-4" />
      </Button>
    </li>
  );
}
