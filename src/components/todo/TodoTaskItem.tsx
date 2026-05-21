import {
  CheckCircle2,
  Circle,
  GripVertical,
  Pencil,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";

import { SwipeAction } from "@/components/common/SwipeAction";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TodoItem, TodoSection } from "@/types";

export type TodoTaskItemProps = {
  todo: TodoItem;
  onToggleTodo: (todoId: TodoItem["_id"]) => void;
  onRenameTodo: (todoId: TodoItem["_id"], title: string) => Promise<void>;
  onMoveTodoToSection?: (
    todoId: TodoItem["_id"],
    targetSectionId: TodoSection["_id"],
  ) => Promise<void>;
  onDeleteTodo: (todoId: TodoItem["_id"]) => void;
  onEditingChange?: (isEditing: boolean) => void;
  dragHandleRef?: (element: Element | null) => void;
  isReorderEnabled?: boolean;
  sections?: TodoSection[];
};

export function TodoTaskItem({
  todo,
  onToggleTodo,
  onRenameTodo,
  onMoveTodoToSection,
  onDeleteTodo,
  onEditingChange,
  dragHandleRef,
  isReorderEnabled = false,
  sections,
}: TodoTaskItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(todo.title);
  const [draftSectionId, setDraftSectionId] = useState<string>(
    todo.sectionId ?? "",
  );
  const [isSaving, setIsSaving] = useState(false);
  const canMoveBetweenSections = Boolean(todo.sectionId && sections?.length);

  const handleSubmit = async (event: React.SubmitEvent) => {
    event.preventDefault();

    if (!draftTitle.trim()) {
      return;
    }

    setIsSaving(true);

    try {
      if (
        canMoveBetweenSections &&
        draftSectionId &&
        draftSectionId !== todo.sectionId
      ) {
        await onMoveTodoToSection?.(
          todo._id,
          draftSectionId as TodoSection["_id"],
        );
      }

      if (draftTitle.trim() !== todo.title) {
        await onRenameTodo(todo._id, draftTitle);
      }

      setIsEditing(false);
      onEditingChange?.(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setDraftTitle(todo.title);
    setDraftSectionId(todo.sectionId ?? "");
    setIsEditing(false);
    onEditingChange?.(false);
  };

  const handleEdit = () => {
    setDraftTitle(todo.title);
    setDraftSectionId(todo.sectionId ?? "");
    setIsEditing(true);
    onEditingChange?.(true);
  };

  if (isEditing) {
    return (
      <div className="rounded-lg border border-border bg-card/70 p-3">
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={handleSubmit}
        >
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row">
            <Input
              aria-label="Todo title"
              value={draftTitle}
              onChange={(event) => {
                setDraftTitle(event.target.value);
              }}
              className="min-w-0 flex-1 px-3 py-2"
            />
            {canMoveBetweenSections ? (
              <Select
                value={draftSectionId}
                onValueChange={(value) => {
                  setDraftSectionId(value);
                }}
              >
                <SelectTrigger
                  aria-label="Todo section"
                  className="h-10 w-full sm:w-44"
                >
                  <SelectValue placeholder="Move to section" />
                </SelectTrigger>
                <SelectContent>
                  {sections?.map((section) => (
                    <SelectItem key={section._id} value={section._id}>
                      {section.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button
              type="submit"
              size="icon"
              disabled={isSaving || !draftTitle.trim()}
              aria-label="Save todo"
            >
              <Save />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={handleCancel}
              aria-label="Cancel todo edit"
            >
              <X />
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <SwipeAction
      actions={
        <>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={handleEdit}
            aria-label="Edit todo"
            className="h-full flex-1 rounded-none text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Pencil />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => {
              onDeleteTodo(todo._id);
            }}
            aria-label="Delete todo"
            className="h-full flex-1 rounded-none bg-destructive/10 text-destructive hover:bg-destructive/15 hover:text-destructive dark:hover:bg-destructive/25! dark:hover:text-destructive/80!"
          >
            <Trash2 />
          </Button>
        </>
      }
      actionWidth={112}
      contentClassName="p-1"
      ariaLabel="Todo actions"
    >
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Reorder todo"
          disabled={!isReorderEnabled}
          className="mt-0.5 shrink-0 cursor-grab text-muted-foreground hover:text-foreground disabled:cursor-default disabled:opacity-45"
          ref={(element) => {
            dragHandleRef?.(element);
          }}
        >
          <GripVertical className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={(e) => {
            e.stopPropagation();
            onToggleTodo(todo._id);
          }}
          className="mt-0.5 text-muted-foreground hover:text-primary"
          aria-label={todo.isCompleted ? "Mark todo open" : "Complete todo"}
        >
          {todo.isCompleted ? (
            <CheckCircle2 className="size-5 text-success" />
          ) : (
            <Circle className="size-5" />
          )}
        </Button>

        <div className="min-w-0 flex-1">
          <p
            className={
              "wrap-break-word text-sm font-medium " +
              (todo.isCompleted
                ? "text-muted-foreground line-through"
                : "text-foreground")
            }
          >
            {todo.title}
          </p>
        </div>
      </div>
    </SwipeAction>
  );
}
