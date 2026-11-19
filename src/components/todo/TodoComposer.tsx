import { MAX_RECIPE_URL_LENGTH } from "@convex/shared/recipe";
import { ClipboardPaste, Plus } from "lucide-react";
import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/hooks";
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

// Text for each variant comes from t.composer.
const COMPOSER_MAX_LENGTHS = {
  todo: MAX_TODO_TITLE_LENGTH,
  recipe: MAX_RECIPE_URL_LENGTH,
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
  const t = useT();
  const { placeholder, inputLabel, submitLabel, reconnectLabel, tooLong } =
    t.composer[variant];
  const maxLength = COMPOSER_MAX_LENGTHS[variant];
  const titleLength = title.trim().length;
  const isTitleTooLong = titleLength > maxLength;
  const showsCount = variant === "todo" && titleLength >= 200;
  const feedback = isTitleTooLong
    ? tooLong(titleLength, maxLength)
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
            {t.composer.paste}
          </Button>
        ) : null}
        <Button
          type="submit"
          size="icon-mobile"
          disabled={!isOnline || !title.trim() || isTitleTooLong}
          className="rounded-full bg-card text-muted-foreground"
          aria-label={isOnline ? submitLabel : reconnectLabel}
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
