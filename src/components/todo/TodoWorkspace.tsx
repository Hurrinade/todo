import { useMutation, useQuery } from "convex/react";
import { CircleSlash } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { TodoComposer } from "@/components/todo/TodoComposer";
import { TodoEmptyState } from "@/components/todo/TodoEmptyState";
import { TodoListHeader } from "@/components/todo/TodoListHeader";
import { TodoListSidebar } from "@/components/todo/TodoListSidebar";
import { TodoSectionedTaskList } from "@/components/todo/TodoSectionedTaskList";
import { TodoSidebarToggle } from "@/components/todo/TodoSidebarToggle";
import { TodoTaskList } from "@/components/todo/TodoTaskList";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  SidebarInset,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar";
import { todoApi } from "@/config/convex-api";
import { cn } from "@/lib/utils";
import { useNetworkStore, useTodoErrorStore, useTodoStore } from "@/stores";
import type { TodoItem, TodoListWithStats, TodoSection } from "@/types";
import { createTodoTitleContent, OFFLINE_ACTION_MESSAGE } from "@/utils";
import { TodoListSmallHeader } from "./TodoListSmallHeader";

export function TodoWorkspace({
  initialActiveListId,
}: {
  initialActiveListId: TodoListWithStats["_id"] | null;
}) {
  const listsResult = useQuery(todoApi.queries.todoLists.list);

  const createSection = useMutation(todoApi.mutations.todoSections.create);
  const renameSection = useMutation(todoApi.mutations.todoSections.rename);
  const reorderSections = useMutation(todoApi.mutations.todoSections.reorder);
  const createTodo = useMutation(todoApi.mutations.todos.create);

  const toggleTodo = useMutation(todoApi.mutations.todos.toggle);
  const deleteTodo = useMutation(todoApi.mutations.todos.remove);
  const reorderTodos = useMutation(todoApi.mutations.todos.reorder);
  const moveTodo = useMutation(todoApi.mutations.todos.move);

  const setLists = useTodoStore((state) => state.setLists);
  const isOnline = useNetworkStore((state) => state.isOnline);
  const [newTodoTitle, setNewTodoTitle] = useState("");

  const [isCreatingTodo, setIsCreatingTodo] = useState(false);
  const [activeListId, setActiveListId] = useState<
    TodoListWithStats["_id"] | null
  >(initialActiveListId);

  const storeLists = useTodoStore((state) => state.lists);

  // Use query results but initially cached fallback
  const lists = listsResult ?? storeLists;
  const activeList = getActiveList(lists, activeListId);

  const setCurrentListTodos = useTodoStore(
    (state) => state.setCurrentListTodos,
  );

  const errorMessage = useTodoErrorStore((state) => state.errorMessage);
  const clearErrorMessage = useTodoErrorStore(
    (state) => state.clearErrorMessage,
  );
  const setErrorMessage = useTodoErrorStore((state) => state.setErrorMessage);
  const setUnknownErrorMessage = useTodoErrorStore(
    (state) => state.setUnknownErrorMessage,
  );

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
  const openTodos = useMemo(
    () => todos.filter((todo) => !todo.isCompleted),
    [todos],
  );
  const completedTodos = useMemo(
    () => todos.filter((todo) => todo.isCompleted),
    [todos],
  );

  // Set zustand data from queries, for local cache
  useEffect(() => {
    if (listsResult === undefined) {
      return;
    }

    setLists(listsResult);
  }, [listsResult, setLists]);

  useEffect(() => {
    if (activeTodoResult === undefined) {
      return;
    }

    setCurrentListTodos(activeTodoResult);
  }, [activeTodoResult, setCurrentListTodos]);

  const handleCreateTodo = async (event: React.SubmitEvent) => {
    event.preventDefault();

    if (!activeList || !newTodoTitle.trim()) {
      return false;
    }

    if (!isOnline) {
      setErrorMessage(OFFLINE_ACTION_MESSAGE);
      return false;
    }

    setIsCreatingTodo(true);
    clearErrorMessage();

    try {
      await createTodo({
        listId: activeList._id,
        title: createTodoTitleContent(newTodoTitle),
      });
      setNewTodoTitle("");
      return true;
    } catch (error) {
      setUnknownErrorMessage(error);
      return false;
    } finally {
      setIsCreatingTodo(false);
    }
  };

  const handleToggleTodo = async (todoId: TodoItem["_id"]) => {
    if (!isOnline) {
      setErrorMessage(OFFLINE_ACTION_MESSAGE);
      return;
    }

    clearErrorMessage();

    try {
      await toggleTodo({ todoId });
    } catch (error) {
      setUnknownErrorMessage(error);
    }
  };

  const handleDeleteTodo = async (todoId: TodoItem["_id"]) => {
    if (!isOnline) {
      setErrorMessage(OFFLINE_ACTION_MESSAGE);
      return;
    }

    clearErrorMessage();

    try {
      await deleteTodo({ todoId });
    } catch (error) {
      setUnknownErrorMessage(error);
    }
  };

  const handleCreateSection = async (title: string) => {
    if (!activeList || activeList.kind !== "sectioned") {
      return;
    }

    if (!isOnline) {
      setErrorMessage(OFFLINE_ACTION_MESSAGE);
      return;
    }

    clearErrorMessage();

    try {
      await createSection({ listId: activeList._id, title });
    } catch (error) {
      setUnknownErrorMessage(error);
      throw error;
    }
  };

  const handleRenameSection = async (
    sectionId: TodoSection["_id"],
    title: string,
  ) => {
    if (!isOnline) {
      setErrorMessage(OFFLINE_ACTION_MESSAGE);
      return;
    }

    clearErrorMessage();

    try {
      await renameSection({ sectionId, title });
    } catch (error) {
      setUnknownErrorMessage(error);
      throw error;
    }
  };

  const handleReorderSections = async (sectionIds: TodoSection["_id"][]) => {
    if (!activeList || activeList.kind !== "sectioned") {
      return;
    }

    if (!isOnline) {
      setErrorMessage(OFFLINE_ACTION_MESSAGE);
      return;
    }

    clearErrorMessage();

    try {
      await reorderSections({ listId: activeList._id, sectionIds });
    } catch (error) {
      setUnknownErrorMessage(error);
      throw error;
    }
  };

  const handleMoveTodo = async (
    todoId: TodoItem["_id"],
    targetSectionId: TodoSection["_id"],
    targetIndex: number,
  ) => {
    if (!isOnline) {
      setErrorMessage(OFFLINE_ACTION_MESSAGE);
      return;
    }

    clearErrorMessage();

    try {
      await moveTodo({ todoId, targetSectionId, targetIndex });
    } catch (error) {
      setUnknownErrorMessage(error);
      throw error;
    }
  };

  const handleReorderTodos = async (todoIds: TodoItem["_id"][]) => {
    if (!activeList) {
      return;
    }

    if (!isOnline) {
      setErrorMessage(OFFLINE_ACTION_MESSAGE);
      return;
    }

    clearErrorMessage();

    try {
      await reorderTodos({
        listId: activeList._id,
        todoIds: [...todoIds, ...completedTodos.map((todo) => todo._id)],
      });
    } catch (error) {
      setUnknownErrorMessage(error);
      throw error;
    }
  };

  return (
    <main className="h-full w-full overflow-hidden bg-background text-foreground">
      <SidebarProvider className="h-full min-h-0 bg-background">
        <TodoListSidebar
          lists={lists}
          activeListId={activeList?._id ?? null}
          setActiveListId={setActiveListId}
        />

        <SidebarInset className="min-h-0 overflow-hidden">
          <TodoWorkspaceContent
            activeList={activeList}
            activeTodoResult={activeTodoResult}
            completedTodos={completedTodos}
            errorMessage={errorMessage}
            isCreatingTodo={isCreatingTodo}
            isOnline={isOnline}
            newTodoTitle={newTodoTitle}
            onCreateSection={handleCreateSection}
            onCreateTodo={handleCreateTodo}
            onDeleteTodo={handleDeleteTodo}
            onMoveTodo={handleMoveTodo}
            onRenameSection={handleRenameSection}
            onReorderSections={handleReorderSections}
            onReorderTodos={handleReorderTodos}
            onTodoTitleChange={setNewTodoTitle}
            onToggleTodo={handleToggleTodo}
            openTodos={openTodos}
            sectionResult={sectionResult}
            sections={sections}
            todos={todos}
          />
        </SidebarInset>
      </SidebarProvider>
    </main>
  );
}

type TodoWorkspaceContentProps = {
  activeList: TodoListWithStats | null;
  activeTodoResult: TodoItem[] | undefined;
  completedTodos: TodoItem[];
  errorMessage: string | null;
  isCreatingTodo: boolean;
  isOnline: boolean;
  newTodoTitle: string;
  onCreateSection: (title: string) => Promise<void>;
  onCreateTodo: (event: React.SubmitEvent) => Promise<boolean>;
  onDeleteTodo: (todoId: TodoItem["_id"]) => Promise<void>;
  onMoveTodo: (
    todoId: TodoItem["_id"],
    targetSectionId: TodoSection["_id"],
    targetIndex: number,
  ) => Promise<void>;
  onRenameSection: (
    sectionId: TodoSection["_id"],
    title: string,
  ) => Promise<void>;
  onReorderSections: (sectionIds: TodoSection["_id"][]) => Promise<void>;
  onReorderTodos: (todoIds: TodoItem["_id"][]) => Promise<void>;
  onTodoTitleChange: (title: string) => void;
  onToggleTodo: (todoId: TodoItem["_id"]) => Promise<void>;
  openTodos: TodoItem[];
  sectionResult: TodoSection[] | undefined;
  sections: TodoSection[];
  todos: TodoItem[];
};

function TodoWorkspaceContent({
  activeList,
  activeTodoResult,
  completedTodos,
  errorMessage,
  isCreatingTodo,
  isOnline,
  newTodoTitle,
  onCreateSection,
  onCreateTodo,
  onDeleteTodo,
  onMoveTodo,
  onRenameSection,
  onReorderSections,
  onReorderTodos,
  onTodoTitleChange,
  onToggleTodo,
  openTodos,
  sectionResult,
  sections,
  todos,
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
            <TodoListHeader list={activeList} />

            <TodoListSmallHeader list={activeList} />

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
                    todos={todos}
                    onCreateSection={onCreateSection}
                    onRenameSection={onRenameSection}
                    onReorderSections={onReorderSections}
                    onToggleTodo={onToggleTodo}
                    onMoveTodo={onMoveTodo}
                    onDeleteTodo={onDeleteTodo}
                  />
                ) : (
                  <TodoTaskList
                    completedTodos={completedTodos}
                    openTodos={openTodos}
                    onToggleTodo={onToggleTodo}
                    onDeleteTodo={onDeleteTodo}
                    onReorderTodos={onReorderTodos}
                  />
                )}
              </div>
            </ScrollArea>

            <div className="sticky bottom-0 left-0 right-0 z-20 min-w-0 px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
              <TodoComposer
                title={newTodoTitle}
                isCreatingTodo={isCreatingTodo}
                isOnline={isOnline}
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
  lists: TodoListWithStats[] | undefined,
  activeListId: TodoListWithStats["_id"] | null,
) {
  if (!lists) {
    return null;
  }

  if (!activeListId) {
    return lists[0] ?? null;
  }

  return lists.find((list) => list._id === activeListId) ?? lists[0] ?? null;
}
