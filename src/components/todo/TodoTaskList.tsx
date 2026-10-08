import { api } from "@convex/_generated/api";
import { DragDropProvider, DragOverlay } from "@dnd-kit/react";
import { isSortable } from "@dnd-kit/react/sortable";
import { useVirtualizer } from "@tanstack/react-virtual";
import { usePaginatedQuery } from "convex/react";
import { ChevronDown, ChevronUp, ClipboardList, RotateCcw } from "lucide-react";
import { Component, useEffect, useMemo, useRef, useState } from "react";

import { SortableTodoTaskItem } from "@/components/todo/SortableTodoTaskItem";
import { TodoEmptyState } from "@/components/todo/TodoEmptyState";
import { TodoTaskItem } from "@/components/todo/TodoTaskItem";
import { Button } from "@/components/ui/button";
import type {
  TodoListItem,
  TodoPaginationErrorBoundaryProps,
  TodoPaginationErrorBoundaryState,
  TodoTaskListProps,
  TodoVirtualRow,
} from "@/types";

const COMPLETED_PAGE_SIZE = 40;
const LOAD_MORE_THRESHOLD = 8;

export function TodoTaskList(props: TodoTaskListProps) {
  const [isCompletedExpanded, setIsCompletedExpanded] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  if (props.openTodos.length === 0 && props.completedTodoCount === 0) {
    return (
      <TodoEmptyState
        icon={ClipboardList}
        title="No todos here"
        description="Add a todo to start shaping this list."
      />
    );
  }

  return (
    <TodoPaginationErrorBoundary
      key={retryKey}
      onRetry={() => {
        setRetryKey((currentKey) => currentKey + 1);
      }}
    >
      <TodoVirtualTaskRows
        {...props}
        isCompletedExpanded={isCompletedExpanded}
        onCompletedExpandedChange={setIsCompletedExpanded}
      />
    </TodoPaginationErrorBoundary>
  );
}

function TodoVirtualTaskRows({
  completedTodoCount,
  listId,
  openTodos,
  scrollElementRef,
  onDeleteTodo,
  onRepositionTodo,
  onToggleTodo,
  isCompletedExpanded,
  onCompletedExpandedChange,
}: TodoTaskListProps & {
  isCompletedExpanded: boolean;
  onCompletedExpandedChange: (isExpanded: boolean) => void;
}) {
  const shouldLoadCompleted = isCompletedExpanded && completedTodoCount > 0;
  const { results, status, loadMore } = usePaginatedQuery(
    api.queries.todos.listCompleted,
    shouldLoadCompleted ? { listId } : "skip",
    { initialNumItems: COMPLETED_PAGE_SIZE },
  );
  const [orderedOpenTodos, setOrderedOpenTodos] = useState(openTodos);
  const [draggedTodo, setDraggedTodo] = useState<TodoListItem | null>(null);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    if (!isDraggingRef.current) {
      setOrderedOpenTodos(openTodos);
    }
  }, [openTodos]);

  const rows = useMemo<TodoVirtualRow[]>(() => {
    const nextRows: TodoVirtualRow[] = orderedOpenTodos.map((todo) => ({
      key: `open-${todo._id}`,
      type: "open",
      todo,
    }));

    if (completedTodoCount === 0) {
      return nextRows;
    }

    nextRows.push({ key: "completed-header", type: "completed-header" });

    if (shouldLoadCompleted) {
      nextRows.push(
        ...results.map((todo) => ({
          key: `completed-${todo._id}`,
          type: "completed" as const,
          todo,
        })),
      );

      if (status === "LoadingFirstPage" || status === "LoadingMore") {
        nextRows.push({ key: "completed-loading", type: "loading" });
      }
    }

    return nextRows;
  }, [
    completedTodoCount,
    orderedOpenTodos,
    results,
    shouldLoadCompleted,
    status,
  ]);

  // TanStack Virtual intentionally exposes mutable measurement functions.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollElementRef.current,
    estimateSize: () => 64,
    getItemKey: (index) => rows[index]?.key ?? index,
    measureElement: (element) => element.getBoundingClientRect().height,
    overscan: 8,
  });
  const virtualRows = virtualizer.getVirtualItems();
  const lastVirtualIndex = virtualRows.at(-1)?.index ?? -1;
  const loadedCompletedEndIndex = orderedOpenTodos.length + results.length;

  useEffect(() => {
    if (
      shouldLoadCompleted &&
      status === "CanLoadMore" &&
      lastVirtualIndex >= loadedCompletedEndIndex - LOAD_MORE_THRESHOLD
    ) {
      loadMore(COMPLETED_PAGE_SIZE);
    }
  }, [
    lastVirtualIndex,
    loadMore,
    loadedCompletedEndIndex,
    shouldLoadCompleted,
    status,
  ]);

  return (
    <DragDropProvider
      onDragStart={(event) => {
        isDraggingRef.current = true;
        const sourceId = event.operation.source?.id;

        setDraggedTodo(
          orderedOpenTodos.find((todo) => todo._id === sourceId) ?? null,
        );
      }}
      onDragEnd={(event) => {
        isDraggingRef.current = false;
        setDraggedTodo(null);

        if (event.canceled) {
          setOrderedOpenTodos(openTodos);
          return;
        }

        const { source } = event.operation;

        if (!isSortable(source)) {
          setOrderedOpenTodos(openTodos);
          return;
        }

        const { initialIndex, index } = source;

        if (initialIndex === index) {
          setOrderedOpenTodos(openTodos);
          return;
        }

        const nextTodos = [...orderedOpenTodos];
        const [movedTodo] = nextTodos.splice(initialIndex, 1);

        if (!movedTodo) {
          setOrderedOpenTodos(openTodos);
          return;
        }

        nextTodos.splice(index, 0, movedTodo);
        const anchorTodo = index > 0 ? nextTodos[index - 1] : nextTodos[1];

        if (!anchorTodo) {
          setOrderedOpenTodos(openTodos);
          return;
        }

        setOrderedOpenTodos(nextTodos);

        void onRepositionTodo(
          movedTodo._id,
          anchorTodo._id,
          index > 0 ? "after" : "before",
        ).catch(() => {
          setOrderedOpenTodos(openTodos);
        });
      }}
    >
      <div
        role="list"
        className="relative w-full"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {virtualRows.map((virtualRow) => {
          const row = rows[virtualRow.index];

          if (!row) {
            return null;
          }

          return (
            <div
              key={row.key}
              ref={virtualizer.measureElement}
              data-index={virtualRow.index}
              className="absolute top-0 left-0 w-full pb-1"
              style={{ transform: `translateY(${virtualRow.start}px)` }}
            >
              {row.type === "open" ? (
                <SortableTodoTaskItem
                  index={virtualRow.index}
                  group="regular-list"
                  isReorderEnabled
                  useMotionWrapper={false}
                  todo={row.todo}
                  onToggleTodo={onToggleTodo}
                  onDeleteTodo={onDeleteTodo}
                />
              ) : row.type === "completed" ? (
                <div role="listitem" className="relative rounded-lg">
                  <TodoTaskItem
                    todo={row.todo}
                    onToggleTodo={onToggleTodo}
                    onDeleteTodo={onDeleteTodo}
                  />
                </div>
              ) : row.type === "completed-header" ? (
                <div className="px-2 pt-2">
                  <button
                    type="button"
                    className="flex min-h-11 w-full items-center justify-between rounded-md px-2 py-2 text-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40 pointer-fine:min-h-0"
                    aria-expanded={shouldLoadCompleted}
                    onClick={() => {
                      onCompletedExpandedChange(!isCompletedExpanded);
                    }}
                  >
                    <span>Completed ({completedTodoCount})</span>
                    {shouldLoadCompleted ? (
                      <ChevronUp className="size-4" />
                    ) : (
                      <ChevronDown className="size-4" />
                    )}
                  </button>
                </div>
              ) : (
                <div className="flex min-h-16 items-center justify-center px-4 text-sm text-muted-foreground">
                  Loading completed todos
                </div>
              )}
            </div>
          );
        })}
      </div>

      <DragOverlay dropAnimation={null}>
        {draggedTodo ? (
          <div className="pointer-events-none w-full rounded-lg bg-background opacity-95 shadow-lg">
            <TodoTaskItem
              todo={draggedTodo}
              onToggleTodo={onToggleTodo}
              onDeleteTodo={onDeleteTodo}
              isReorderEnabled
            />
          </div>
        ) : null}
      </DragOverlay>
    </DragDropProvider>
  );
}

class TodoPaginationErrorBoundary extends Component<
  TodoPaginationErrorBoundaryProps,
  TodoPaginationErrorBoundaryState
> {
  state: TodoPaginationErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-lg border border-border bg-card/55 px-4 text-center">
        <p className="text-sm text-muted-foreground">
          Completed todos could not be loaded.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={this.props.onRetry}
        >
          <RotateCcw className="size-4" />
          Retry
        </Button>
      </div>
    );
  }
}
