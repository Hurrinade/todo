import { ListChecks, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

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
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
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
  onSelectList,
}: TodoListSidebarProps) {
  const { isMobile } = useSidebar();
  const [searchQuery, setSearchQuery] = useState("");
  const visibleLists = useMemo(() => {
    const normalizedSearchQuery = searchQuery.trim().toLowerCase();

    if (!normalizedSearchQuery) {
      return lists;
    }

    return lists.filter((list) =>
      list.title.toLowerCase().includes(normalizedSearchQuery),
    );
  }, [lists, searchQuery]);

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
              <SidebarMenu className="gap-2 pr-2">
                {visibleLists.map((list) => {
                  const isActive = list._id === activeListId;

                  return (
                    <SidebarMenuItem key={list._id}>
                      <SidebarMenuButton
                        type="button"
                        isActive={isActive}
                        onClick={() => {
                          onSelectList(list._id);
                        }}
                        className={
                          "h-auto flex-col items-stretch gap-2 rounded-lg border p-3 pr-10 " +
                          (isActive
                            ? "border-sidebar-primary bg-sidebar-primary/15 text-sidebar-foreground"
                            : "border-sidebar-border bg-background/45 text-muted-foreground hover:border-sidebar-primary/60")
                        }
                      >
                        <span className="block truncate text-sm font-semibold">
                          {list.title}
                        </span>
                        <span className="flex items-center justify-between gap-3 text-xs">
                          <span>{list.openTodoCount} open</span>
                          <span>{list.completedTodoCount} done</span>
                        </span>
                      </SidebarMenuButton>
                      <SidebarMenuAction
                        type="button"
                        showOnHover={!isMobile}
                        aria-label={`Delete ${list.title}`}
                        className={isMobile ? "opacity-100" : undefined}
                        onClick={(event) => {
                          event.stopPropagation();
                          onDeleteList(list);
                        }}
                      >
                        <Trash2 />
                      </SidebarMenuAction>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </ScrollArea>
          )}
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
