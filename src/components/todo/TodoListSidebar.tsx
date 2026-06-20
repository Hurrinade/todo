import { SignOutButton } from "@clerk/react";
import { DragDropProvider } from "@dnd-kit/react";
import { isSortable } from "@dnd-kit/react/sortable";
import { useMutation } from "convex/react";
import { ListChecks, Plus, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import BackgroundColorPicker from "@/components/common/BackgroundColorPicker";
import ThemeToggle from "@/components/common/ThemeToggle";
import { SortableTodoListSidebarItem } from "@/components/todo/SortableTodoListSidebarItem";
import { TodoSidebarToggle } from "@/components/todo/TodoSidebarToggle";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
} from "@/components/ui/sidebar";
import { todoApi } from "@/config/convex-api";
import { useModal } from "@/hooks/modals/use-modal";
import { useTodoErrorStore } from "@/stores";
import type { CreateTodoListModalValues, TodoListWithStats } from "@/types";

type TodoListSidebarProps = {
  lists: TodoListWithStats[];
  activeListId: TodoListWithStats["_id"] | null;
  setActiveListId: (listId: TodoListWithStats["_id"] | null) => void;
};

export function TodoListSidebar({
  lists,
  activeListId,
  setActiveListId,
}: TodoListSidebarProps) {
  const { openModal } = useModal();

  // Store lists

  const createList = useMutation(todoApi.mutations.todoLists.create);
  const reorderLists = useMutation(todoApi.mutations.todoLists.reorder);
  const clearErrorMessage = useTodoErrorStore(
    (state) => state.clearErrorMessage,
  );
  const setUnknownErrorMessage = useTodoErrorStore(
    (state) => state.setUnknownErrorMessage,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [orderedLists, setOrderedLists] = useState(lists);
  const [isLoading, setIsLoading] = useState(false);
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

  const handleCreateList = async ({
    title,
    emoji,
    kind,
  }: CreateTodoListModalValues) => {
    const normalizedTitle = title.trim();

    if (!normalizedTitle || isLoading) {
      return false;
    }

    setIsLoading(true);
    clearErrorMessage();

    try {
      const listId = await createList({
        title: normalizedTitle,
        emoji,
        kind,
      });
      setActiveListId(listId);
      return true;
    } catch (error) {
      setUnknownErrorMessage(error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleReorderLists = async (listIds: TodoListWithStats["_id"][]) => {
    clearErrorMessage();

    try {
      await reorderLists({ listIds });
    } catch (error) {
      setUnknownErrorMessage(error);
      throw error;
    }
  };

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
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="Create a new list"
              disabled={isLoading}
              onClick={() => {
                openModal("createTodoList", {
                  onSubmit: handleCreateList,
                });
              }}
            >
              <Plus className="size-4" />
            </Button>
            <TodoSidebarToggle placement="sidebar" />
          </div>
        </div>

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

      <SidebarContent className="overflow-hidden pt-4">
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

                  void handleReorderLists(
                    nextLists.map((list) => list._id),
                  ).catch(() => {
                    setOrderedLists(visibleLists);
                  });
                }}
              >
                <SidebarMenu>
                  {orderedLists.map((list, index) => (
                    <SortableTodoListSidebarItem
                      key={list._id}
                      index={index}
                      activeListId={activeListId}
                      setActiveListId={setActiveListId}
                      isReorderEnabled={isReorderEnabled}
                      list={list}
                    />
                  ))}
                </SidebarMenu>
              </DragDropProvider>
            </ScrollArea>
          )}
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="gap-2 border-t border-sidebar-border p-4">
        <div className="flex w-full items-center gap-2">
          <ThemeToggle />
          <BackgroundColorPicker />
        </div>

        <SignOutButton>
          <Button type="button" variant="outline" className="h-9 w-full">
            Log out
          </Button>
        </SignOutButton>
      </SidebarFooter>
    </Sidebar>
  );
}
