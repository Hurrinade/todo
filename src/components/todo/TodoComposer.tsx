import { MAX_RECIPE_URL_LENGTH } from "@convex/shared/recipe";
import { ClipboardPaste, Plus } from "lucide-react";
import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { MAX_TODO_TITLE_LENGTH } from "@/utils";

type TodoComposerProps = {
  title: string;
  createError: string | null;
  isOnline: boolean;
  onTitleChange: (title: string) => void;
  /** Returns whether the todo was submitted. */
  onCreateTodo: (event: React.SubmitEvent) => boolean;
  onSubmitted?: () => void;
  /** Recipe lists take a link or a recipe name instead of a todo title. */
  variant?: "todo" | "recipe";
};

const COMPOSER_VARIANTS = {
  todo: {
    placeholder: "Add the next thing",
    inputLabel: "New todo title",
    submitLabel: "Add todo",
    maxLength: MAX_TODO_TITLE_LENGTH,
  },
  recipe: {
    placeholder: "Paste a link or type a recipe name",
    inputLabel: "Recipe link or name",
    submitLabel: "Save recipe",
    maxLength: MAX_RECIPE_URL_LENGTH,
  },
} as const;

// Reading the clipboard needs a secure context; older browsers lack it.
const canPaste =
  typeof navigator !== "undefined" &&
  "clipboard" in navigator &&
  "readText" in navigator.clipboard;

export function TodoComposer({
  title,
  createError,
  isOnline,
  onTitleChange,
  onCreateTodo,
  onSubmitted,
  variant = "todo",
}: TodoComposerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { placeholder, inputLabel, submitLabel, maxLength } =
    COMPOSER_VARIANTS[variant];
  const titleLength = title.trim().length;
  const isTitleTooLong = titleLength > maxLength;
  const showsCount = variant === "todo" && titleLength >= 200;
  const feedback = isTitleTooLong
    ? `${variant === "todo" ? "Title" : "Link"} is too long (${titleLength}/${maxLength}).`
    : createError;
  const showsPaste = variant === "recipe" && canPaste && !title;

  // On phones a Paste button beats long-pressing the field. The browser may
  // ask for permission first; a refusal leaves the field as it was.
  const handlePaste = async () => {
    try {
      const text = (await navigator.clipboard.readText()).trim();

      if (text) {
        onTitleChange(text);
      }
    } catch {
      // Permission denied or nothing to read.
    }

    inputRef.current?.focus();
  };

  return (
    <form
      className="flex flex-col gap-1 p-2"
      onSubmit={(event) => {
        if (onCreateTodo(event)) {
          requestAnimationFrame(() => {
            onSubmitted?.();
            inputRef.current?.focus();
          });
        }
      }}
    >
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          aria-label={inputLabel}
          aria-invalid={isTitleTooLong}
          aria-describedby={
            feedback || showsCount ? "new-todo-title-feedback" : undefined
          }
          value={title}
          onChange={(event) => {
            onTitleChange(event.target.value);
          }}
          placeholder={placeholder}
          className="h-11 min-w-0 flex-1 py-2 pointer-fine:h-8"
        />
        {showsPaste ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              void handlePaste();
            }}
            className="h-11 rounded-full pointer-fine:h-8"
          >
            <ClipboardPaste />
            Paste
          </Button>
        ) : null}
        <Button
          type="submit"
          size="icon-mobile"
          disabled={!isOnline || !title.trim() || isTitleTooLong}
          className="rounded-full bg-card text-muted-foreground"
          aria-label={
            isOnline ? submitLabel : `Reconnect to ${submitLabel.toLowerCase()}`
          }
        >
          <Plus />
        </Button>
      </div>
      {(feedback || showsCount) && (
        <p
          id="new-todo-title-feedback"
          role={feedback ? "alert" : undefined}
          className={cn(
            "text-xs",
            feedback ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {feedback ?? `${titleLength}/${maxLength}`}
        </p>
      )}
    </form>
  );
}
