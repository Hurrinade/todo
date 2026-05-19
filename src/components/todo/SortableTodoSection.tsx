import { useDroppable } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { GripVertical, Pencil, Save, X } from "lucide-react";
import { useState } from "react";

import { SortableTodoTaskItem } from "@/components/todo/SortableTodoTaskItem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { TodoFilter, TodoItem, TodoSection } from "@/types";

type SortableTodoSectionProps = {
  section: TodoSection;
  index: number;
  todos: TodoItem[];
  activeFilter: TodoFilter;
  sections: TodoSection[];
  onToggleTodo: (todoId: TodoItem["_id"]) => void;
  onRenameTodo: (todoId: TodoItem["_id"], title: string) => Promise<void>;
  onMoveTodoToSection: (
    todoId: TodoItem["_id"],
    targetSectionId: TodoSection["_id"],
  ) => Promise<void>;
  onDeleteTodo: (todoId: TodoItem["_id"]) => void;
  onRenameSection: (
    sectionId: TodoSection["_id"],
    title: string,
  ) => Promise<void>;
};

export function SortableTodoSection({
  section,
  index,
  todos,
  activeFilter,
  sections,
  onToggleTodo,
  onRenameTodo,
  onMoveTodoToSection,
  onDeleteTodo,
  onRenameSection,
}: SortableTodoSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(section.title);
  const [isSaving, setIsSaving] = useState(false);
  const {
    ref: sectionRef,
    handleRef: sectionHandleRef,
    isDragging,
  } = useSortable({
    id: section._id,
    index,
    group: "sections",
    type: "section",
    data: {
      type: "section",
      sectionId: section._id,
    },
  });
  const { ref: dropRef } = useDroppable({
    id: `section-drop-${section._id}`,
    type: "section-drop",
    accept: "todo",
    data: {
      type: "section-drop",
      sectionId: section._id,
    },
  });

  const handleSubmit = async (event: React.SubmitEvent) => {
    event.preventDefault();

    if (!draftTitle.trim() || draftTitle.trim() === section.title) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);

    try {
      await onRenameSection(section._id, draftTitle);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const emptyMessage =
    activeFilter === "completed"
      ? "No completed todos in this section."
      : activeFilter === "open"
        ? "No open todos in this section."
        : "No todos in this section yet.";

  return (
    <li
      ref={sectionRef}
      className={cn(
        "p-2",
        index === 0 ? "border-none" : "border-t border-border/80",
        isDragging && "relative z-20 shadow-lg shadow-background/25",
      )}
    >
      <div className="my-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Reorder section"
            className="mt-0.5 shrink-0 cursor-grab text-muted-foreground hover:text-foreground"
            ref={(element) => {
              sectionHandleRef(element);
            }}
          >
            <GripVertical className="size-4" />
          </Button>

          <div className="min-w-0 flex-1">
            {isEditing ? (
              <form
                className="flex flex-col gap-2 sm:flex-row sm:items-center"
                onSubmit={handleSubmit}
              >
                <Input
                  aria-label="Section title"
                  value={draftTitle}
                  onChange={(event) => {
                    setDraftTitle(event.target.value);
                  }}
                  className="h-10 min-w-0 flex-1"
                />
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    size="icon"
                    disabled={isSaving || !draftTitle.trim()}
                    aria-label="Save section"
                  >
                    <Save />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    aria-label="Cancel section edit"
                    onClick={() => {
                      setDraftTitle(section.title);
                      setIsEditing(false);
                    }}
                  >
                    <X />
                  </Button>
                </div>
              </form>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="wrap-break-word text-base font-semibold text-foreground">
                  {section.title}
                </h3>
              </div>
            )}
          </div>
        </div>

        {!isEditing && !section.isDefault ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              setDraftTitle(section.title);
              setIsEditing(true);
            }}
            aria-label="Rename section"
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            <Pencil className="size-4" />
          </Button>
        ) : null}
      </div>

      <div ref={dropRef} className={cn("rounded-xl bg-background/35")}>
        {todos.length === 0 ? (
          <div className="px-2 py-6 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {todos.map((todo, todoIndex) => (
              <SortableTodoTaskItem
                key={todo._id}
                index={todoIndex}
                group={section._id}
                isReorderEnabled
                todo={todo}
                onToggleTodo={onToggleTodo}
                onRenameTodo={onRenameTodo}
                onMoveTodoToSection={onMoveTodoToSection}
                onDeleteTodo={onDeleteTodo}
                sections={sections}
              />
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}
