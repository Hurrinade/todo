import { DragDropProvider } from "@dnd-kit/react";
import { isSortable } from "@dnd-kit/react/sortable";
import { ListChecks, Plus, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { SortableTodoListSidebarItem } from "@/components/todo/SortableTodoListSidebarItem";
import { TodoSidebarToggle } from "@/components/todo/TodoSidebarToggle";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import type { TodoListWithStats } from "@/types";

type TodoListSidebarProps = {
  lists: TodoListWithStats[];
  activeListId: TodoListWithStats["_id"] | null;
  newListTitle: string;
  isCreatingList: boolean;
  onNewListTitleChange: (title: string) => void;
  onCreateList: (event: React.SubmitEvent) => void;
  onDeleteList: (list: TodoListWithStats) => void;
  onReorderLists: (listIds: TodoListWithStats["_id"][]) => Promise<void>;
  onSelectList: (listId: TodoListWithStats["_id"]) => void;
};

export function TodoListSidebar({
  lists,
  activeListId,
  newListTitle,
  isCreatingList,
  onNewListTitleChange,
  onCreateList,
  onDeleteList,
  onReorderLists,
  onSelectList,
}: TodoListSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [orderedLists, setOrderedLists] = useState(lists);
  const isDraggingRef = useRef(false);
  const visibleLists = useMemo(() => {
    const normalizedSearchQuery = searchQuery.trim().toLowerCase();

    if (!normalizedSearchQuery) {
      return lists;
    }

    return lists.filter((list) =>
      list.title.toLowerCase().includes(normalizedSearchQuery),
    );
  }, [lists, searchQuery]);
  const isReorderEnabled = searchQuery.trim().length === 0;

  useEffect(() => {
    if (!isDraggingRef.current) {
      setOrderedLists(visibleLists);
    }
  }, [visibleLists]);

  return (
    <Sidebar className="border-sidebar-border">
      <SidebarHeader className="gap-4 border-b border-sidebar-border p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-[0.22em] text-sidebar-primary uppercase">
              Lists
            </p>
            <h2 className="mt-1 truncate text-lg font-semibold text-sidebar-foreground">
              Your boards
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-lg border border-sidebar-border bg-background px-2 py-1 text-xs text-muted-foreground">
              {lists.length}
            </div>
            <TodoSidebarToggle placement="sidebar" />
          </div>
        </div>

        <form className="flex gap-2" onSubmit={onCreateList}>
          <SidebarInput
            aria-label="New list title"
            value={newListTitle}
            onChange={(event) => {
              onNewListTitleChange(event.target.value);
            }}
            placeholder="New list"
            className="min-w-0 flex-1"
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

        {lists.length > 0 && (
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <SidebarInput
              aria-label="Search lists by title"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
              }}
              placeholder="Search lists"
              className="pl-8"
            />
          </div>
        )}
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent className="overflow-hidden p-2">
        <SidebarGroup className="min-h-0 flex-1 p-0">
          {lists.length === 0 ? (
            <div className="flex items-center gap-3 rounded-lg border border-dashed border-sidebar-border bg-background/35 p-3 text-sm text-muted-foreground">
              <ListChecks className="size-4 text-sidebar-primary" />
              Create your first list.
            </div>
          ) : visibleLists.length === 0 ? (
            <div className="rounded-lg border border-dashed border-sidebar-border bg-background/35 p-3 text-sm text-muted-foreground">
              No lists match this search.
            </div>
          ) : (
            <ScrollArea className="min-h-0 flex-1">
              <DragDropProvider
                onDragStart={() => {
                  isDraggingRef.current = true;
                }}
                onDragEnd={(event) => {
                  isDraggingRef.current = false;

                  if (event.canceled) {
                    setOrderedLists(visibleLists);
                    return;
                  }

                  const { source } = event.operation;

                  if (!isReorderEnabled || !isSortable(source)) {
                    setOrderedLists(visibleLists);
                    return;
                  }

                  const { initialIndex, index } = source;

                  if (initialIndex === index) {
                    setOrderedLists(visibleLists);
                    return;
                  }

                  const nextLists = [...orderedLists];
                  const [movedList] = nextLists.splice(initialIndex, 1);

                  if (!movedList) {
                    setOrderedLists(visibleLists);
                    return;
                  }

                  nextLists.splice(index, 0, movedList);
                  setOrderedLists(nextLists);

                  void onReorderLists(nextLists.map((list) => list._id)).catch(
                    () => {
                      setOrderedLists(visibleLists);
                    },
                  );
                }}
              >
                <SidebarMenu className="gap-2 pr-2">
                  {orderedLists.map((list, index) => (
                    <SortableTodoListSidebarItem
                      key={list._id}
                      index={index}
                      isActive={list._id === activeListId}
                      isReorderEnabled={isReorderEnabled}
                      list={list}
                      onDeleteList={onDeleteList}
                      onSelectList={onSelectList}
                    />
                  ))}
                </SidebarMenu>
              </DragDropProvider>
            </ScrollArea>
          )}
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
