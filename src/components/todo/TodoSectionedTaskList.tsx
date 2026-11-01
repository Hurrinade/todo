import { DragDropProvider } from "@dnd-kit/react";
import { isSortable } from "@dnd-kit/react/sortable";
import { FolderTree, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { SortableTodoSection } from "@/components/todo/SortableTodoSection";
import { TodoEmptyState } from "@/components/todo/TodoEmptyState";
import { Accordion } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCompletedTodos } from "@/hooks";
import { useNetworkStore } from "@/stores";
import type { TodoListItem, TodoSection } from "@/types";
import { todoDragSensors } from "@/utils";

type TodoSectionedTaskListProps = {
  listId: TodoListItem["listId"];
  sections: TodoSection[];
  /** Open todos, ascending by order. */
  todos: TodoListItem[];
  onCreateSection: (title: string) => Promise<void>;
  onRenameSection: (
    sectionId: TodoSection["_id"],
    title: string,
  ) => Promise<void>;
  onReorderSections: (sectionIds: TodoSection["_id"][]) => Promise<void>;
  onToggleTodo: (todoId: TodoListItem["_id"]) => void;
  onMoveTodo: (
    todoId: TodoListItem["_id"],
    targetSectionId: TodoSection["_id"],
    targetIndex: number,
  ) => Promise<void>;
  onDeleteTodo: (todoId: TodoListItem["_id"]) => void;
};

type TodoDragData = {
  type: "todo";
  todoId: TodoListItem["_id"];
  sectionId?: TodoListItem["sectionId"];
};

type SectionDragData =
  | {
      type: "section";
      sectionId: TodoSection["_id"];
    }
  | {
      type: "section-drop";
      sectionId: TodoSection["_id"];
    };

// Open todos are draggable and live in local state during a drag. Completed
// todos come from the shared paginated query and render under each section.
export function TodoSectionedTaskList({
  listId,
  sections,
  todos,
  onCreateSection,
  onRenameSection,
  onReorderSections,
  onToggleTodo,
  onMoveTodo,
  onDeleteTodo,
}: TodoSectionedTaskListProps) {
  const isOnline = useNetworkStore((state) => state.isOnline);
  const completedTodos = useCompletedTodos(listId);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [isCreatingSection, setIsCreatingSection] = useState(false);
  const [orderedSections, setOrderedSections] = useState(sections);
  const [sectionTodoMap, setSectionTodoMap] = useState(() =>
    buildSectionTodoMap(sections, todos),
  );
  const [closedSectionIds, setClosedSectionIds] = useState<string[]>([]);
  const isDraggingRef = useRef(false);
  const todoDragRef = useRef<{
    todoId: TodoListItem["_id"];
    sectionId: TodoSection["_id"];
    bucketIndex: number;
  } | null>(null);

  useEffect(() => {
    if (!isDraggingRef.current) {
      setOrderedSections(sections);
      setSectionTodoMap(buildSectionTodoMap(sections, todos));
    }
  }, [sections, todos]);
  const completedTodoMap = buildSectionTodoMap(
    sections,
    completedTodos.results,
  );
  const openSectionIds = sections
    .map((section) => section._id)
    .filter((sectionId) => !closedSectionIds.includes(sectionId));

  const handleCreateSection = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!newSectionTitle.trim()) {
      return;
    }

    setIsCreatingSection(true);

    try {
      await onCreateSection(newSectionTitle);
      setNewSectionTitle("");
    } finally {
      setIsCreatingSection(false);
    }
  };

  if (sections.length === 0) {
    return (
      <TodoEmptyState
        icon={FolderTree}
        title="No sections yet"
        description="Create a section to start organizing this list."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <form className="p-2" onSubmit={handleCreateSection}>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            aria-label="New section title"
            value={newSectionTitle}
            onChange={(event) => {
              setNewSectionTitle(event.target.value);
            }}
            placeholder="Add a new section"
            disabled={!isOnline}
            className="h-11 min-w-0 flex-1 pointer-fine:h-10"
          />
          <Button
            type="submit"
            disabled={!isOnline || isCreatingSection || !newSectionTitle.trim()}
            className="h-11 shrink-0 pointer-fine:h-10"
          >
            <Plus data-icon="inline-start" />
            Add section
          </Button>
        </div>
      </form>

      <DragDropProvider
        sensors={todoDragSensors}
        onDragStart={(event) => {
          if (!isOnline) {
            return;
          }

          isDraggingRef.current = true;

          const sourceData = getSortableData(event.operation.source);

          if (sourceData?.type === "todo") {
            const sectionId = findSectionIdForTodo(
              sectionTodoMap,
              sourceData.todoId,
            );

            if (!sectionId) {
              return;
            }

            todoDragRef.current = {
              todoId: sourceData.todoId,
              sectionId,
              bucketIndex: getTodoBucketIndex(
                sectionTodoMap,
                sourceData.todoId,
              ),
            };
          }
        }}
        onDragOver={(event) => {
          const source = event.operation.source;
          const target = event.operation.target;
          const sourceData = getSortableData(source);

          // Section drags rely on dnd-kit's optimistic DOM sorting.
          if (sourceData?.type !== "todo") {
            return;
          }

          // Todo order lives in React state only. Letting dnd-kit also move
          // the DOM nodes makes the two orders fight and rows jump.
          event.preventDefault();

          if (!isOnline || !target) {
            return;
          }

          setSectionTodoMap((currentMap) => {
            const activeTodo = findTodoById(currentMap, sourceData.todoId);
            const sourceSectionId = findSectionIdForTodo(
              currentMap,
              sourceData.todoId,
            );

            if (!activeTodo || !sourceSectionId) {
              return currentMap;
            }

            const targetLocation = getTargetLocation(
              currentMap,
              target,
              activeTodo,
              sourceSectionId,
            );

            if (!targetLocation) {
              return currentMap;
            }

            return moveTodoInSectionMap(
              currentMap,
              sourceData.todoId,
              sourceSectionId,
              targetLocation.sectionId,
              targetLocation.bucketIndex,
            );
          });
        }}
        onDragEnd={(event) => {
          if (!isOnline) {
            return;
          }

          isDraggingRef.current = false;
          const sourceData = getSortableData(event.operation.source);

          if (event.canceled) {
            todoDragRef.current = null;
            setOrderedSections(sections);
            setSectionTodoMap(buildSectionTodoMap(sections, todos));
            return;
          }

          if (
            sourceData?.type === "section" &&
            isSortable(event.operation.source)
          ) {
            const { initialIndex, index } = event.operation.source;

            if (initialIndex === index) {
              setOrderedSections(sections);
              return;
            }

            const nextSections = [...orderedSections];
            const [movedSection] = nextSections.splice(initialIndex, 1);

            if (!movedSection) {
              setOrderedSections(sections);
              return;
            }

            nextSections.splice(index, 0, movedSection);
            setOrderedSections(nextSections);

            void onReorderSections(
              nextSections.map((section) => section._id),
            ).catch(() => {
              setOrderedSections(sections);
            });
            return;
          }

          if (sourceData?.type !== "todo" || !todoDragRef.current) {
            return;
          }

          const finalSectionId = findSectionIdForTodo(
            sectionTodoMap,
            todoDragRef.current.todoId,
          );

          if (!finalSectionId) {
            todoDragRef.current = null;
            setSectionTodoMap(buildSectionTodoMap(sections, todos));
            return;
          }

          const finalBucketIndex = getTodoBucketIndex(
            sectionTodoMap,
            todoDragRef.current.todoId,
          );
          const shouldPersist =
            finalSectionId !== todoDragRef.current.sectionId ||
            finalBucketIndex !== todoDragRef.current.bucketIndex;

          if (!shouldPersist) {
            todoDragRef.current = null;
            return;
          }

          const activeTodoId = todoDragRef.current.todoId;
          todoDragRef.current = null;

          void onMoveTodo(activeTodoId, finalSectionId, finalBucketIndex).catch(
            () => {
              setSectionTodoMap(buildSectionTodoMap(sections, todos));
            },
          );
        }}
      >
        <Accordion
          type="multiple"
          value={openSectionIds}
          onValueChange={(nextOpenSectionIds) => {
            const nextOpenSectionIdSet = new Set(nextOpenSectionIds);

            setClosedSectionIds(
              sections
                .map((section) => section._id)
                .filter((sectionId) => !nextOpenSectionIdSet.has(sectionId)),
            );
          }}
          className="gap-4"
        >
          <ul className="flex flex-col gap-4">
            {orderedSections.map((section, index) => (
              <SortableTodoSection
                key={section._id}
                section={section}
                index={index}
                todos={sectionTodoMap[section._id] ?? []}
                completedTodos={completedTodoMap[section._id] ?? []}
                onToggleTodo={onToggleTodo}
                onDeleteTodo={onDeleteTodo}
                onRenameSection={onRenameSection}
              />
            ))}
          </ul>
        </Accordion>
      </DragDropProvider>

      {(completedTodos.status === "CanLoadMore" ||
        completedTodos.status === "LoadingMore") && (
        <Button
          type="button"
          variant="ghost"
          disabled={completedTodos.status === "LoadingMore"}
          onClick={completedTodos.loadMore}
          className="h-11 self-center text-muted-foreground pointer-fine:h-9"
        >
          {completedTodos.status === "LoadingMore"
            ? "Loading completed todos"
            : "Show more completed"}
        </Button>
      )}
    </div>
  );
}

/** Groups todos by section, keeping their order. */
function buildSectionTodoMap(sections: TodoSection[], todos: TodoListItem[]) {
  const nextMap: Record<string, TodoListItem[]> = Object.fromEntries(
    sections.map((section) => [section._id, []]),
  );

  for (const todo of todos) {
    if (todo.sectionId) {
      nextMap[todo.sectionId]?.push(todo);
    }
  }

  return nextMap;
}

function getSortableData(entity: { data?: unknown } | null | undefined) {
  if (!entity || typeof entity.data !== "object" || entity.data == null) {
    return null;
  }

  return entity.data as TodoDragData | SectionDragData;
}

function findTodoById(
  sectionTodoMap: Record<string, TodoListItem[]>,
  todoId: TodoListItem["_id"],
) {
  for (const todos of Object.values(sectionTodoMap)) {
    const todo = todos.find((item) => item._id === todoId);

    if (todo) {
      return todo;
    }
  }

  return null;
}

function findSectionIdForTodo(
  sectionTodoMap: Record<string, TodoListItem[]>,
  todoId: TodoListItem["_id"],
) {
  for (const [sectionId, todos] of Object.entries(sectionTodoMap)) {
    if (todos.some((todo) => todo._id === todoId)) {
      return sectionId as TodoSection["_id"];
    }
  }

  return null;
}

function getTodoBucketIndex(
  sectionTodoMap: Record<string, TodoListItem[]>,
  todoId: TodoListItem["_id"],
) {
  const sectionId = findSectionIdForTodo(sectionTodoMap, todoId);

  return sectionId
    ? (sectionTodoMap[sectionId] ?? []).findIndex((todo) => todo._id === todoId)
    : 0;
}

function getTargetLocation(
  sectionTodoMap: Record<string, TodoListItem[]>,
  target: { data?: unknown },
  activeTodo: TodoListItem,
  sourceSectionId: TodoSection["_id"],
) {
  const targetData = getSortableData(target);

  if (!targetData) {
    return null;
  }

  if (targetData.type === "section" || targetData.type === "section-drop") {
    // Hovering the gap between rows of the todo's own section should not
    // snap it to the end of that section.
    if (targetData.sectionId === sourceSectionId) {
      return null;
    }

    return {
      sectionId: targetData.sectionId,
      bucketIndex: getOtherTodos(
        sectionTodoMap,
        targetData.sectionId,
        activeTodo._id,
      ).length,
    };
  }

  const targetSectionId = findSectionIdForTodo(
    sectionTodoMap,
    targetData.todoId,
  );

  if (!targetSectionId) {
    return null;
  }

  const otherTodos = getOtherTodos(
    sectionTodoMap,
    targetSectionId,
    activeTodo._id,
  );
  const targetIndex = otherTodos.findIndex(
    (todo) => todo._id === targetData.todoId,
  );

  return {
    sectionId: targetSectionId,
    bucketIndex: targetIndex >= 0 ? targetIndex : otherTodos.length,
  };
}

function getOtherTodos(
  sectionTodoMap: Record<string, TodoListItem[]>,
  sectionId: TodoSection["_id"],
  activeTodoId: TodoListItem["_id"],
) {
  return (sectionTodoMap[sectionId] ?? []).filter(
    (todo) => todo._id !== activeTodoId,
  );
}

function moveTodoInSectionMap(
  sectionTodoMap: Record<string, TodoListItem[]>,
  todoId: TodoListItem["_id"],
  sourceSectionId: TodoSection["_id"],
  targetSectionId: TodoSection["_id"],
  targetBucketIndex: number,
) {
  const nextMap = Object.fromEntries(
    Object.entries(sectionTodoMap).map(([sectionId, todos]) => [
      sectionId,
      [...todos],
    ]),
  ) as Record<string, TodoListItem[]>;
  const sourceTodos = nextMap[sourceSectionId] ?? [];
  const todoIndex = sourceTodos.findIndex((todo) => todo._id === todoId);

  if (todoIndex < 0) {
    return sectionTodoMap;
  }

  const [activeTodo] = sourceTodos.splice(todoIndex, 1);

  if (!activeTodo) {
    return sectionTodoMap;
  }

  const targetTodos =
    sourceSectionId === targetSectionId
      ? sourceTodos
      : [...(nextMap[targetSectionId] ?? [])];
  const insertionIndex = Math.max(
    0,
    Math.min(targetBucketIndex, targetTodos.length),
  );

  // Same slot: keep the map identity so React skips the re-render.
  if (sourceSectionId === targetSectionId && insertionIndex === todoIndex) {
    return sectionTodoMap;
  }

  targetTodos.splice(insertionIndex, 0, {
    ...activeTodo,
    sectionId: targetSectionId,
  });

  nextMap[sourceSectionId] =
    sourceSectionId === targetSectionId ? targetTodos : sourceTodos;
  nextMap[targetSectionId] = targetTodos;

  return nextMap;
}
