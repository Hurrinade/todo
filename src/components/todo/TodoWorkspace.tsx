import { useMutation, useQuery } from "convex/react";
import { CircleSlash, Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { TodoComposer } from "@/components/todo/TodoComposer";
import { TodoEmptyState } from "@/components/todo/TodoEmptyState";
import { TodoListHeader } from "@/components/todo/TodoListHeader";
import { TodoListSidebar } from "@/components/todo/TodoListSidebar";
import { TodoSectionedTaskList } from "@/components/todo/TodoSectionedTaskList";
import { TodoTaskList } from "@/components/todo/TodoTaskList";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  SidebarInset,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar";
import { todoApi } from "@/config/convex-api";
import { useModal } from "@/hooks/modals/use-modal";
import { cn } from "@/lib/utils";
import { useTodoStore } from "@/stores";
import type {
  CreateTodoListModalValues,
  TodoFilter,
  TodoItem,
  TodoListWithStats,
  TodoSection,
} from "@/types";
import { TodoSidebarToggle } from "@/components/todo/TodoSidebarToggle";

type TodoWorkspaceProps = {
  initialActiveListId?: TodoListWithStats["_id"] | null;
};

export function TodoWorkspace({
  initialActiveListId = null,
}: TodoWorkspaceProps) {
  const { openModal } = useModal();
  const listsResult = useQuery(todoApi.queries.todoLists.list);
  const createList = useMutation(todoApi.mutations.todoLists.create);
  const renameList = useMutation(todoApi.mutations.todoLists.rename);
  const reorderLists = useMutation(todoApi.mutations.todoLists.reorder);
  const deleteList = useMutation(todoApi.mutations.todoLists.remove);
  const createSection = useMutation(todoApi.mutations.todoSections.create);
  const renameSection = useMutation(todoApi.mutations.todoSections.rename);
  const reorderSections = useMutation(todoApi.mutations.todoSections.reorder);
  const createTodo = useMutation(todoApi.mutations.todos.create);
  const clearCompletedTodos = useMutation(
    todoApi.mutations.todos.clearCompleted,
  );
  const toggleTodo = useMutation(todoApi.mutations.todos.toggle);
  const deleteTodo = useMutation(todoApi.mutations.todos.remove);
  const reorderTodos = useMutation(todoApi.mutations.todos.reorder);
  const moveTodo = useMutation(todoApi.mutations.todos.move);
  const uncheckCompletedTodos = useMutation(
    todoApi.mutations.todos.uncheckCompleted,
  );

  const [activeListId, setActiveListId] = useState<
    TodoListWithStats["_id"] | null
  >(initialActiveListId);
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [listTitleDraft, setListTitleDraft] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<TodoFilter>("all");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [isCreatingTodo, setIsCreatingTodo] = useState(false);
  const [isRenamingList, setIsRenamingList] = useState(false);
  const [isClearingCompleted, setIsClearingCompleted] = useState(false);
  const [isUncheckingCompleted, setIsUncheckingCompleted] = useState(false);
  const setCurrentListTodos = useTodoStore(
    (state) => state.setCurrentListTodos,
  );

  const lists = useMemo(() => listsResult ?? [], [listsResult]);
  const activeList = getActiveList(lists, activeListId);
  const activeTodoResult = useQuery(
    todoApi.queries.todos.list,
    activeList ? { listId: activeList._id } : "skip",
  );
  const sectionResult = useQuery(
    todoApi.queries.todoSections.list,
    activeList?.kind === "sectioned" ? { listId: activeList._id } : "skip",
  );
  const todos = useMemo(() => activeTodoResult ?? [], [activeTodoResult]);
  const sections = useMemo(() => sectionResult ?? [], [sectionResult]);
  const visibleTodos = useMemo(
    () => filterTodos(todos, activeFilter),
    [todos, activeFilter],
  );
  const isReorderEnabled = activeFilter === "all";
  const visibleListTitle =
    listTitleDraft ?? activeList?.title ?? "Untitled list";
  const normalizedDraftTitle = visibleListTitle.trim();
  const normalizedActiveListTitle = activeList?.title.trim() ?? "";

  // On initial load add list to store
  useEffect(() => {
    if (!activeList || activeTodoResult === undefined) {
      return;
    }

    setCurrentListTodos(activeList._id, activeTodoResult);
  }, [activeList, activeTodoResult, setCurrentListTodos]);

  const handleCreateList = async ({
    title,
    kind,
  }: CreateTodoListModalValues) => {
    const normalizedTitle = title.trim();

    if (!normalizedTitle || isCreatingList) {
      return false;
    }

    setIsCreatingList(true);
    setErrorMessage(null);

    try {
      const listId = await createList({
        title: normalizedTitle,
        kind,
      });
      setActiveListId(listId);
      setListTitleDraft(null);
      setActiveFilter("all");
      return true;
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      return false;
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

  const handleRenameList = async () => {
    if (!activeList || isRenamingList) {
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

    setIsRenamingList(true);
    setErrorMessage(null);

    try {
      await renameList({ listId: activeList._id, title: normalizedDraftTitle });
      setListTitleDraft(null);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsRenamingList(false);
    }
  };

  const handleDeleteList = (list: TodoListWithStats) => {
    openModal("confirm", {
      title: "Delete todo list",
      message: `Delete "${list.title}" and every todo inside it?`,
      confirmText: "Delete list",
      cancelText: "Keep list",
      variant: "danger",
      onConfirm: async () => {
        setErrorMessage(null);
        await deleteList({ listId: list._id });

        if (activeListId === list._id) {
          setActiveListId(null);
          setListTitleDraft(null);
          setActiveFilter("all");
        }
      },
    });
  };

  const handleReorderLists = async (listIds: TodoListWithStats["_id"][]) => {
    setErrorMessage(null);

    try {
      await reorderLists({ listIds });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      throw error;
    }
  };

  const handleCreateTodo = async (event: React.SubmitEvent) => {
    event.preventDefault();

    if (!activeList || !newTodoTitle.trim()) {
      return false;
    }

    setIsCreatingTodo(true);
    setErrorMessage(null);

    try {
      await createTodo({ listId: activeList._id, title: newTodoTitle });
      setNewTodoTitle("");
      setActiveFilter((currentFilter) =>
        currentFilter === "completed" ? "all" : currentFilter,
      );
      return true;
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      return false;
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

  const handleDeleteTodo = async (todoId: TodoItem["_id"]) => {
    setErrorMessage(null);

    try {
      await deleteTodo({ todoId });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  };

  const handleCreateSection = async (title: string) => {
    if (!activeList || activeList.kind !== "sectioned") {
      return;
    }

    setErrorMessage(null);

    try {
      await createSection({ listId: activeList._id, title });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      throw error;
    }
  };

  const handleRenameSection = async (
    sectionId: TodoSection["_id"],
    title: string,
  ) => {
    setErrorMessage(null);

    try {
      await renameSection({ sectionId, title });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      throw error;
    }
  };

  const handleReorderSections = async (sectionIds: TodoSection["_id"][]) => {
    if (!activeList || activeList.kind !== "sectioned") {
      return;
    }

    setErrorMessage(null);

    try {
      await reorderSections({ listId: activeList._id, sectionIds });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      throw error;
    }
  };

  const handleMoveTodo = async (
    todoId: TodoItem["_id"],
    targetSectionId: TodoSection["_id"],
    targetIndex: number,
  ) => {
    setErrorMessage(null);

    try {
      await moveTodo({ todoId, targetSectionId, targetIndex });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      throw error;
    }
  };

  const handleClearCompleted = () => {
    if (!activeList || activeList.completedTodoCount === 0) {
      return;
    }

    const completedLabel =
      activeList.completedTodoCount === 1 ? "todo" : "todos";

    openModal("confirm", {
      title: "Clear completed todos",
      message: `Delete ${activeList.completedTodoCount} completed ${completedLabel} from "${activeList.title}"?`,
      confirmText: "Delete completed",
      cancelText: "Keep todos",
      variant: "danger",
      onConfirm: async () => {
        setIsClearingCompleted(true);
        setErrorMessage(null);

        try {
          await clearCompletedTodos({ listId: activeList._id });
        } catch (error) {
          setErrorMessage(getErrorMessage(error));
          throw error;
        } finally {
          setIsClearingCompleted(false);
        }
      },
    });
  };

  const handleUncheckCompleted = async () => {
    if (!activeList || activeList.completedTodoCount === 0) {
      return;
    }

    setIsUncheckingCompleted(true);
    setErrorMessage(null);

    try {
      await uncheckCompletedTodos({ listId: activeList._id });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsUncheckingCompleted(false);
    }
  };

  const handleReorderTodos = async (todoIds: TodoItem["_id"][]) => {
    if (!activeList || !isReorderEnabled) {
      return;
    }

    setErrorMessage(null);

    try {
      await reorderTodos({ listId: activeList._id, todoIds });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      throw error;
    }
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
          isCreatingList={isCreatingList}
          onCreateList={handleCreateList}
          onDeleteList={handleDeleteList}
          onReorderLists={handleReorderLists}
          onSelectList={handleSelectList}
        />

        <SidebarInset className="min-h-0 overflow-hidden">
          <TodoWorkspaceContent
            activeFilter={activeFilter}
            activeList={activeList}
            activeTodoResult={activeTodoResult}
            errorMessage={errorMessage}
            isClearingCompleted={isClearingCompleted}
            isCreatingTodo={isCreatingTodo}
            isRenamingList={isRenamingList}
            isReorderEnabled={isReorderEnabled}
            isUncheckingCompleted={isUncheckingCompleted}
            listTitleDraft={visibleListTitle}
            newTodoTitle={newTodoTitle}
            onClearCompleted={handleClearCompleted}
            onCreateSection={handleCreateSection}
            onCreateTodo={handleCreateTodo}
            onDeleteTodo={handleDeleteTodo}
            onFilterChange={setActiveFilter}
            onMoveTodo={handleMoveTodo}
            onRenameList={handleRenameList}
            onRenameSection={handleRenameSection}
            onReorderSections={handleReorderSections}
            onReorderTodos={handleReorderTodos}
            onTitleDraftChange={(title) => {
              setListTitleDraft(title);
            }}
            onTodoTitleChange={setNewTodoTitle}
            onToggleTodo={handleToggleTodo}
            onUncheckCompleted={handleUncheckCompleted}
            sectionResult={sectionResult}
            sections={sections}
            visibleTodos={visibleTodos}
          />
        </SidebarInset>
      </SidebarProvider>
    </main>
  );
}

type TodoWorkspaceContentProps = {
  activeFilter: TodoFilter;
  activeList: TodoListWithStats | null;
  activeTodoResult: TodoItem[] | undefined;
  errorMessage: string | null;
  isClearingCompleted: boolean;
  isCreatingTodo: boolean;
  isRenamingList: boolean;
  isReorderEnabled: boolean;
  isUncheckingCompleted: boolean;
  listTitleDraft: string;
  newTodoTitle: string;
  onClearCompleted: () => void;
  onCreateSection: (title: string) => Promise<void>;
  onCreateTodo: (event: React.SubmitEvent) => Promise<boolean>;
  onDeleteTodo: (todoId: TodoItem["_id"]) => Promise<void>;
  onFilterChange: (filter: TodoFilter) => void;
  onMoveTodo: (
    todoId: TodoItem["_id"],
    targetSectionId: TodoSection["_id"],
    targetIndex: number,
  ) => Promise<void>;
  onRenameList: () => Promise<void>;
  onRenameSection: (
    sectionId: TodoSection["_id"],
    title: string,
  ) => Promise<void>;
  onReorderSections: (sectionIds: TodoSection["_id"][]) => Promise<void>;
  onReorderTodos: (todoIds: TodoItem["_id"][]) => Promise<void>;
  onTitleDraftChange: (title: string) => void;
  onTodoTitleChange: (title: string) => void;
  onToggleTodo: (todoId: TodoItem["_id"]) => Promise<void>;
  onUncheckCompleted: () => Promise<void>;
  sectionResult: TodoSection[] | undefined;
  sections: TodoSection[];
  visibleTodos: TodoItem[];
};

function TodoWorkspaceContent({
  activeFilter,
  activeList,
  activeTodoResult,
  errorMessage,
  isClearingCompleted,
  isCreatingTodo,
  isRenamingList,
  isReorderEnabled,
  isUncheckingCompleted,
  listTitleDraft,
  newTodoTitle,
  onClearCompleted,
  onCreateSection,
  onCreateTodo,
  onDeleteTodo,
  onFilterChange,
  onMoveTodo,
  onRenameList,
  onRenameSection,
  onReorderSections,
  onReorderTodos,
  onTitleDraftChange,
  onTodoTitleChange,
  onToggleTodo,
  onUncheckCompleted,
  sectionResult,
  sections,
  visibleTodos,
}: TodoWorkspaceContentProps) {
  const { isMobile, open, openMobile } = useSidebar();
  const todoListViewportRef = useRef<HTMLDivElement>(null);
  const isSidebarOpen = isMobile ? openMobile : open;

  return (
    <>
      {errorMessage && (
        <div className="border-b border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </div>
      )}

      <div className="relative min-h-0 flex-1 overflow-hidden">
        {activeList ? (
          <div className={cn("flex h-full min-h-0 flex-col")}>
            <TodoListHeader
              titleDraft={listTitleDraft}
              completedTodoCount={activeList.completedTodoCount}
              isRenaming={isRenamingList}
              isClearingCompleted={isClearingCompleted}
              isUncheckingCompleted={isUncheckingCompleted}
              onClearCompleted={onClearCompleted}
              onTitleDraftChange={onTitleDraftChange}
              onRenameList={onRenameList}
              onUncheckCompleted={() => {
                void onUncheckCompleted();
              }}
              list={activeList}
              activeFilter={activeFilter}
              onFilterChange={onFilterChange}
            />

            <ScrollArea
              viewportRef={todoListViewportRef}
              className="min-h-0 flex-1"
            >
              <div className="flex flex-col gap-4 px-2 py-3">
                {activeTodoResult === undefined ? (
                  <div className="flex min-h-40 items-center justify-center rounded-lg border border-border bg-card/55 text-sm text-muted-foreground">
                    Loading todos
                  </div>
                ) : activeList.kind === "sectioned" &&
                  sectionResult === undefined ? (
                  <div className="flex min-h-40 items-center justify-center rounded-lg border border-border bg-card/55 text-sm text-muted-foreground">
                    Loading sections
                  </div>
                ) : activeList.kind === "sectioned" ? (
                  <TodoSectionedTaskList
                    key={activeList._id}
                    sections={sections}
                    todos={visibleTodos}
                    activeFilter={activeFilter}
                    onCreateSection={onCreateSection}
                    onRenameSection={onRenameSection}
                    onReorderSections={onReorderSections}
                    onToggleTodo={onToggleTodo}
                    onMoveTodo={onMoveTodo}
                    onDeleteTodo={onDeleteTodo}
                  />
                ) : (
                  <TodoTaskList
                    todos={visibleTodos}
                    activeFilter={activeFilter}
                    isReorderEnabled={isReorderEnabled}
                    onToggleTodo={onToggleTodo}
                    onDeleteTodo={onDeleteTodo}
                    onReorderTodos={onReorderTodos}
                  />
                )}
              </div>
            </ScrollArea>

            <div className="sticky bottom-0 left-0 right-0 z-20 min-w-0 p-2">
              <TodoComposer
                title={newTodoTitle}
                isCreatingTodo={isCreatingTodo}
                onTitleChange={onTodoTitleChange}
                onCreateTodo={onCreateTodo}
                onCreateSuccess={() => {
                  todoListViewportRef.current?.scrollTo({ top: 0 });
                }}
              />
            </div>
          </div>
        ) : (
          <div className="p-10 items-start justify-center flex flex-col w-full h-full">
            <TodoSidebarToggle placement="floating" />
            <div
              className={cn(
                "flex h-full w-full min-h-0 items-center justify-center p-4",
                !isSidebarOpen && "pt-16",
              )}
            >
              <TodoEmptyState
                icon={CircleSlash}
                title="No list selected"
                description="Create a list in the left rail to start collecting todos."
              />
            </div>
          </div>
        )}
      </div>
    </>
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
