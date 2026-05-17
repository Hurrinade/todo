import { useMutation, useQuery } from "convex/react";
import { CircleSlash, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";

import { TodoComposer } from "@/components/todo/TodoComposer";
import { TodoEmptyState } from "@/components/todo/TodoEmptyState";
import { TodoFilterTabs } from "@/components/todo/TodoFilterTabs";
import { TodoListHeader } from "@/components/todo/TodoListHeader";
import { TodoListSidebar } from "@/components/todo/TodoListSidebar";
import { TodoTaskList } from "@/components/todo/TodoTaskList";
import { TodoWorkspaceHeader } from "@/components/todo/TodoWorkspaceHeader";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { todoApi } from "@/config/convex-api";
import { useModal } from "@/hooks/modals/use-modal";
import type { TodoFilter, TodoItem, TodoListWithStats } from "@/types";

export function TodoWorkspace() {
  const { openModal } = useModal();
  const listsResult = useQuery(todoApi.queries.todoLists.list);
  const createList = useMutation(todoApi.mutations.todoLists.create);
  const renameList = useMutation(todoApi.mutations.todoLists.rename);
  const deleteList = useMutation(todoApi.mutations.todoLists.remove);
  const createTodo = useMutation(todoApi.mutations.todos.create);
  const toggleTodo = useMutation(todoApi.mutations.todos.toggle);
  const renameTodo = useMutation(todoApi.mutations.todos.rename);
  const deleteTodo = useMutation(todoApi.mutations.todos.remove);

  const [activeListId, setActiveListId] = useState<
    TodoListWithStats["_id"] | null
  >(null);
  const [newListTitle, setNewListTitle] = useState("");
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [listTitleDraft, setListTitleDraft] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<TodoFilter>("all");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [isCreatingTodo, setIsCreatingTodo] = useState(false);
  const [isRenamingList, setIsRenamingList] = useState(false);

  const lists = useMemo(() => listsResult ?? [], [listsResult]);
  const activeList = getActiveList(lists, activeListId);
  const activeTodoResult = useQuery(
    todoApi.queries.todos.list,
    activeList ? { listId: activeList._id } : "skip",
  );
  const todos = useMemo(() => activeTodoResult ?? [], [activeTodoResult]);
  const visibleTodos = useMemo(
    () => filterTodos(todos, activeFilter),
    [todos, activeFilter],
  );
  const visibleListTitle =
    listTitleDraft ?? activeList?.title ?? "Untitled list";

  const handleCreateList = async (event: React.SubmitEvent) => {
    event.preventDefault();

    if (!newListTitle.trim()) {
      return;
    }

    setIsCreatingList(true);
    setErrorMessage(null);

    try {
      const listId = await createList({ title: newListTitle });
      setNewListTitle("");
      setActiveListId(listId);
      setListTitleDraft(null);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsCreatingList(false);
    }
  };

  const handleSelectList = (listId: TodoListWithStats["_id"]) => {
    setActiveListId(listId);
    setListTitleDraft(null);
    setActiveFilter("all");
    setErrorMessage(null);
  };

  const handleRenameList = async (event: React.SubmitEvent) => {
    event.preventDefault();

    if (!activeList || !visibleListTitle.trim()) {
      return;
    }

    setIsRenamingList(true);
    setErrorMessage(null);

    try {
      await renameList({ listId: activeList._id, title: visibleListTitle });
      setListTitleDraft(null);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsRenamingList(false);
    }
  };

  const handleDeleteList = () => {
    if (!activeList) {
      return;
    }

    openModal("confirm", {
      title: "Delete todo list",
      message: `Delete "${activeList.title}" and every todo inside it?`,
      confirmText: "Delete list",
      cancelText: "Keep list",
      variant: "danger",
      onConfirm: async () => {
        setErrorMessage(null);
        await deleteList({ listId: activeList._id });
        setActiveListId(null);
        setListTitleDraft(null);
      },
    });
  };

  const handleCreateTodo = async (event: React.SubmitEvent) => {
    event.preventDefault();

    if (!activeList || !newTodoTitle.trim()) {
      return;
    }

    setIsCreatingTodo(true);
    setErrorMessage(null);

    try {
      await createTodo({ listId: activeList._id, title: newTodoTitle });
      setNewTodoTitle("");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsCreatingTodo(false);
    }
  };

  const handleToggleTodo = async (todoId: TodoItem["_id"]) => {
    setErrorMessage(null);

    try {
      await toggleTodo({ todoId });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  };

  const handleRenameTodo = async (todoId: TodoItem["_id"], title: string) => {
    setErrorMessage(null);

    try {
      await renameTodo({ todoId, title });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      throw error;
    }
  };

  const handleDeleteTodo = (todoId: TodoItem["_id"], title: string) => {
    openModal("confirm", {
      title: "Delete todo",
      message: `Delete "${title}"?`,
      confirmText: "Delete todo",
      cancelText: "Keep todo",
      variant: "danger",
      onConfirm: async () => {
        setErrorMessage(null);
        await deleteTodo({ todoId });
      },
    });
  };

  if (listsResult === undefined) {
    return (
      <main className="flex h-full w-full items-center justify-center bg-background p-6">
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          <Loader2 className="size-4" />
          Loading todo workspace
        </div>
      </main>
    );
  }

  return (
    <main className="h-full w-full overflow-hidden bg-background text-foreground">
      <SidebarProvider className="h-full min-h-0 bg-background">
        <TodoListSidebar
          lists={lists}
          activeListId={activeList?._id ?? null}
          newListTitle={newListTitle}
          isCreatingList={isCreatingList}
          onNewListTitleChange={setNewListTitle}
          onCreateList={handleCreateList}
          onSelectList={handleSelectList}
        />

        <SidebarInset className="min-h-0 overflow-hidden">
          <TodoWorkspaceHeader />

          {errorMessage && (
            <div className="border-b border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {errorMessage}
            </div>
          )}

          {activeList ? (
            <>
              <TodoListHeader
                titleDraft={visibleListTitle}
                isRenaming={isRenamingList}
                onTitleDraftChange={setListTitleDraft}
                onRenameList={handleRenameList}
                onDeleteList={handleDeleteList}
              />

              <div className="flex justify-between items-center mt-2">
                <div className="w-full">
                  <TodoComposer
                    title={newTodoTitle}
                    isCreatingTodo={isCreatingTodo}
                    onTitleChange={setNewTodoTitle}
                    onCreateTodo={handleCreateTodo}
                  />
                </div>

                <TodoFilterTabs
                  list={activeList}
                  activeFilter={activeFilter}
                  onFilterChange={setActiveFilter}
                />
              </div>

              <ScrollArea className="min-h-0 flex-1">
                <div className="flex flex-col gap-4 p-4 md:p-6">
                  {activeTodoResult === undefined ? (
                    <div className="flex min-h-40 items-center justify-center rounded-lg border border-border bg-card/55 text-sm text-muted-foreground">
                      Loading todos
                    </div>
                  ) : (
                    <TodoTaskList
                      todos={visibleTodos}
                      activeFilter={activeFilter}
                      onToggleTodo={handleToggleTodo}
                      onRenameTodo={handleRenameTodo}
                      onDeleteTodo={handleDeleteTodo}
                    />
                  )}
                </div>
              </ScrollArea>
            </>
          ) : (
            <div className="flex min-h-0 flex-1 items-center justify-center p-4">
              <TodoEmptyState
                icon={CircleSlash}
                title="No list selected"
                description="Create a list in the left rail to start collecting todos."
              />
            </div>
          )}
        </SidebarInset>
      </SidebarProvider>
    </main>
  );
}

function getActiveList(
  lists: TodoListWithStats[],
  activeListId: TodoListWithStats["_id"] | null,
) {
  if (!activeListId) {
    return lists[0] ?? null;
  }

  return lists.find((list) => list._id === activeListId) ?? lists[0] ?? null;
}

function filterTodos(todos: TodoItem[], activeFilter: TodoFilter) {
  if (activeFilter === "completed") {
    return todos.filter((todo) => todo.isCompleted);
  }

  if (activeFilter === "open") {
    return todos.filter((todo) => !todo.isCompleted);
  }

  return todos;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong.";
}
