import { DragDropProvider } from "@dnd-kit/react";
import { isSortable } from "@dnd-kit/react/sortable";
import { FolderTree, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { SortableTodoSection } from "@/components/todo/SortableTodoSection";
import { TodoEmptyState } from "@/components/todo/TodoEmptyState";
import { Accordion } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TodoFilter, TodoItem, TodoSection } from "@/types";

type TodoSectionedTaskListProps = {
  sections: TodoSection[];
  todos: TodoItem[];
  activeFilter: TodoFilter;
  onCreateSection: (title: string) => Promise<void>;
  onRenameSection: (
    sectionId: TodoSection["_id"],
    title: string,
  ) => Promise<void>;
  onReorderSections: (sectionIds: TodoSection["_id"][]) => Promise<void>;
  onToggleTodo: (todoId: TodoItem["_id"]) => void;
  onRenameTodo: (todoId: TodoItem["_id"], title: string) => Promise<void>;
  onMoveTodo: (
    todoId: TodoItem["_id"],
    targetSectionId: TodoSection["_id"],
    targetIndex: number,
  ) => Promise<void>;
  onMoveTodoToSection: (
    todoId: TodoItem["_id"],
    targetSectionId: TodoSection["_id"],
  ) => Promise<void>;
  onDeleteTodo: (todoId: TodoItem["_id"]) => void;
};

type TodoDragData = {
  type: "todo";
  todoId: TodoItem["_id"];
  sectionId?: TodoItem["sectionId"];
  isCompleted: boolean;
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

export function TodoSectionedTaskList({
  sections,
  todos,
  activeFilter,
  onCreateSection,
  onRenameSection,
  onReorderSections,
  onToggleTodo,
  onRenameTodo,
  onMoveTodo,
  onMoveTodoToSection,
  onDeleteTodo,
}: TodoSectionedTaskListProps) {
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [isCreatingSection, setIsCreatingSection] = useState(false);
  const [orderedSections, setOrderedSections] = useState(sections);
  const [sectionTodoMap, setSectionTodoMap] = useState(() =>
    buildSectionTodoMap(sections, todos),
  );
  const [closedSectionIds, setClosedSectionIds] = useState<string[]>([]);
  const isDraggingRef = useRef(false);
  const todoDragRef = useRef<{
    todoId: TodoItem["_id"];
    sectionId: TodoSection["_id"];
    bucketIndex: number;
  } | null>(null);

  useEffect(() => {
    if (!isDraggingRef.current) {
      setOrderedSections(sections);
      setSectionTodoMap(buildSectionTodoMap(sections, todos));
    }
  }, [sections, todos]);
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
            className="h-10 min-w-0 flex-1"
          />
          <Button
            type="submit"
            disabled={isCreatingSection || !newSectionTitle.trim()}
            className="h-10 shrink-0"
          >
            <Plus data-icon="inline-start" />
            Add section
          </Button>
        </div>
      </form>

      <DragDropProvider
        onDragStart={(event) => {
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

          if (!isSortable(source) || sourceData?.type !== "todo" || !target) {
            return;
          }

          const activeTodo = findTodoById(sectionTodoMap, sourceData.todoId);
          const sourceSectionId = findSectionIdForTodo(
            sectionTodoMap,
            sourceData.todoId,
          );

          if (!activeTodo || !sourceSectionId) {
            return;
          }

          const targetLocation = getTargetLocation(
            sectionTodoMap,
            target,
            activeTodo,
            sourceData.todoId,
          );

          if (!targetLocation) {
            return;
          }

          setSectionTodoMap((currentMap) =>
            moveTodoInSectionMap(
              currentMap,
              sourceData.todoId,
              sourceSectionId,
              targetLocation.sectionId,
              targetLocation.bucketIndex,
            ),
          );
        }}
        onDragEnd={(event) => {
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
                activeFilter={activeFilter}
                sections={orderedSections}
                onToggleTodo={onToggleTodo}
                onRenameTodo={onRenameTodo}
                onMoveTodoToSection={onMoveTodoToSection}
                onDeleteTodo={onDeleteTodo}
                onRenameSection={onRenameSection}
              />
            ))}
          </ul>
        </Accordion>
      </DragDropProvider>
    </div>
  );
}

function buildSectionTodoMap(sections: TodoSection[], todos: TodoItem[]) {
  const nextMap: Record<string, TodoItem[]> = {};

  for (const section of sections) {
    nextMap[section._id] = [];
  }

  for (const todo of todos) {
    if (!todo.sectionId) {
      continue;
    }

    nextMap[todo.sectionId] = [...(nextMap[todo.sectionId] ?? []), todo];
  }

  for (const section of sections) {
    nextMap[section._id] = (nextMap[section._id] ?? []).sort(
      compareSectionTodos,
    );
  }

  return nextMap;
}

function compareSectionTodos(firstTodo: TodoItem, secondTodo: TodoItem) {
  if (firstTodo.isCompleted !== secondTodo.isCompleted) {
    return Number(firstTodo.isCompleted) - Number(secondTodo.isCompleted);
  }

  if (firstTodo.order !== undefined && secondTodo.order !== undefined) {
    return firstTodo.order - secondTodo.order;
  }

  if (firstTodo.order !== undefined) {
    return -1;
  }

  if (secondTodo.order !== undefined) {
    return 1;
  }

  return secondTodo._creationTime - firstTodo._creationTime;
}

function getSortableData(entity: { data?: unknown } | null | undefined) {
  if (!entity || typeof entity.data !== "object" || entity.data == null) {
    return null;
  }

  return entity.data as TodoDragData | SectionDragData;
}

function findTodoById(
  sectionTodoMap: Record<string, TodoItem[]>,
  todoId: TodoItem["_id"],
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
  sectionTodoMap: Record<string, TodoItem[]>,
  todoId: TodoItem["_id"],
) {
  for (const [sectionId, todos] of Object.entries(sectionTodoMap)) {
    if (todos.some((todo) => todo._id === todoId)) {
      return sectionId as TodoSection["_id"];
    }
  }

  return null;
}

function getTodoBucketIndex(
  sectionTodoMap: Record<string, TodoItem[]>,
  todoId: TodoItem["_id"],
) {
  const todo = findTodoById(sectionTodoMap, todoId);

  if (!todo) {
    return 0;
  }

  const sectionId = findSectionIdForTodo(sectionTodoMap, todoId);

  if (!sectionId) {
    return 0;
  }

  const sectionTodos = sectionTodoMap[sectionId] ?? [];

  return sectionTodos.reduce((bucketIndex, sectionTodo) => {
    if (sectionTodo._id === todoId) {
      return bucketIndex;
    }

    return sectionTodo.isCompleted === todo.isCompleted
      ? bucketIndex + 1
      : bucketIndex;
  }, 0);
}

function getTargetLocation(
  sectionTodoMap: Record<string, TodoItem[]>,
  target: { data?: unknown },
  activeTodo: TodoItem,
  activeTodoId: TodoItem["_id"],
) {
  const targetData = getSortableData(target);

  if (!targetData) {
    return null;
  }

  if (targetData.type === "section" || targetData.type === "section-drop") {
    const targetSectionTodos = (
      sectionTodoMap[targetData.sectionId] ?? []
    ).filter(
      (todo) =>
        todo._id !== activeTodoId &&
        todo.isCompleted === activeTodo.isCompleted,
    );

    return {
      sectionId: targetData.sectionId,
      bucketIndex: targetSectionTodos.length,
    };
  }

  if (targetData.type !== "todo") {
    return null;
  }

  const targetTodo = findTodoById(sectionTodoMap, targetData.todoId);
  const targetSectionId = findSectionIdForTodo(
    sectionTodoMap,
    targetData.todoId,
  );

  if (!targetTodo || !targetSectionId) {
    return null;
  }

  const sameBucketTodos = (sectionTodoMap[targetSectionId] ?? []).filter(
    (todo) =>
      todo._id !== activeTodoId && todo.isCompleted === activeTodo.isCompleted,
  );

  if (targetTodo.isCompleted !== activeTodo.isCompleted) {
    return {
      sectionId: targetSectionId,
      bucketIndex: activeTodo.isCompleted ? 0 : sameBucketTodos.length,
    };
  }

  const targetBucketIndex = sameBucketTodos.findIndex(
    (todo) => todo._id === targetTodo._id,
  );

  return {
    sectionId: targetSectionId,
    bucketIndex:
      targetBucketIndex >= 0 ? targetBucketIndex : sameBucketTodos.length,
  };
}

function moveTodoInSectionMap(
  sectionTodoMap: Record<string, TodoItem[]>,
  todoId: TodoItem["_id"],
  sourceSectionId: TodoSection["_id"],
  targetSectionId: TodoSection["_id"],
  targetBucketIndex: number,
) {
  const nextMap = Object.fromEntries(
    Object.entries(sectionTodoMap).map(([sectionId, todos]) => [
      sectionId,
      [...todos],
    ]),
  ) as Record<string, TodoItem[]>;
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
  const openCount = targetTodos.filter((todo) => !todo.isCompleted).length;
  const insertionIndex = activeTodo.isCompleted
    ? openCount + Math.max(0, Math.min(targetBucketIndex, targetTodos.length))
    : Math.max(0, Math.min(targetBucketIndex, openCount));

  targetTodos.splice(insertionIndex, 0, {
    ...activeTodo,
    sectionId: targetSectionId,
  });

  nextMap[sourceSectionId] =
    sourceSectionId === targetSectionId ? targetTodos : sourceTodos;
  nextMap[targetSectionId] = targetTodos;

  return nextMap;
}
