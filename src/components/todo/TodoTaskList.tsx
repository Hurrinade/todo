import { DragDropProvider, DragOverlay } from "@dnd-kit/react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ChevronDown, ChevronUp, ClipboardList } from "lucide-react";
import { useMemo, useState } from "react";

import { SortableTodoTaskItem } from "@/components/todo/SortableTodoTaskItem";
import { TodoEmptyState } from "@/components/todo/TodoEmptyState";
import { TodoPaginationErrorBoundary } from "@/components/todo/TodoPaginationErrorBoundary";
import { TodoTaskItem } from "@/components/todo/TodoTaskItem";
import { useCompletedTodos } from "@/hooks";
import type { TodoListItem, TodoTaskListProps, TodoVirtualRow } from "@/types";
import { todoDragSensors } from "@/utils";

const LOAD_MORE_THRESHOLD = 8;

export function TodoTaskList(props: TodoTaskListProps) {
  const [isCompletedExpanded, setIsCompletedExpanded] = useState(false);

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
    <TodoPaginationErrorBoundary>
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
  const { results, status, loadMore } = useCompletedTodos(
    listId,
    shouldLoadCompleted,
  );
  // Local order while a drag is in progress; server order the rest of the time.
  // The reposition optimistic update takes over as soon as the drag ends.
  const [dragOrder, setDragOrder] = useState<TodoListItem[] | null>(null);
  const [draggedTodo, setDraggedTodo] = useState<TodoListItem | null>(null);
  const orderedOpenTodos = dragOrder ?? openTodos;

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
    // Loads the next completed page when its end scrolls into view. Fires on
    // scroll and whenever the visible range changes, e.g. after a page lands.
    onChange: (instance) => {
      const lastVisibleIndex = instance.getVirtualItems().at(-1)?.index ?? -1;

      if (
        shouldLoadCompleted &&
        status === "CanLoadMore" &&
        lastVisibleIndex >=
          orderedOpenTodos.length + results.length - LOAD_MORE_THRESHOLD
      ) {
        loadMore();
      }
    },
    getScrollElement: () => scrollElementRef.current,
    estimateSize: () => 64,
    getItemKey: (index) => rows[index]?.key ?? index,
    measureElement: (element) => element.getBoundingClientRect().height,
    overscan: 8,
  });
  const virtualRows = virtualizer.getVirtualItems();

  return (
    <DragDropProvider
      sensors={todoDragSensors}
      onDragStart={(event) => {
        const sourceId = event.operation.source?.id;

        setDragOrder(openTodos);
        setDraggedTodo(
          orderedOpenTodos.find((todo) => todo._id === sourceId) ?? null,
        );
      }}
      onDragOver={(event) => {
        // Rows are absolutely positioned by the virtualizer, so dnd-kit's
        // optimistic DOM sorting can't reorder them. React state does it.
        event.preventDefault();

        const { source, target } = event.operation;

        if (!source || !target || source.id === target.id) {
          return;
        }

        setDragOrder((todos) => {
          if (!todos) {
            return todos;
          }

          const fromIndex = todos.findIndex((todo) => todo._id === source.id);
          const toIndex = todos.findIndex((todo) => todo._id === target.id);

          if (fromIndex < 0 || toIndex < 0) {
            return todos;
          }

          const nextTodos = [...todos];
          const [movedTodo] = nextTodos.splice(fromIndex, 1);

          if (movedTodo) {
            nextTodos.splice(toIndex, 0, movedTodo);
          }

          return nextTodos;
        });
      }}
      onDragEnd={(event) => {
        setDragOrder(null);
        setDraggedTodo(null);

        const sourceId = event.operation.source?.id;
        const index = orderedOpenTodos.findIndex(
          (todo) => todo._id === sourceId,
        );
        const movedTodo = orderedOpenTodos[index];
        const anchorTodo =
          index > 0 ? orderedOpenTodos[index - 1] : orderedOpenTodos[1];
        const initialIndex = openTodos.findIndex(
          (todo) => todo._id === sourceId,
        );

        if (
          event.canceled ||
          !movedTodo ||
          !anchorTodo ||
          index === initialIndex
        ) {
          return;
        }

        // A failed reposition rolls back its optimistic update and shows the
        // error through the workspace, so nothing is left to restore here.
        void onRepositionTodo(
          movedTodo._id,
          anchorTodo._id,
          index > 0 ? "after" : "before",
        ).catch(() => undefined);
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
