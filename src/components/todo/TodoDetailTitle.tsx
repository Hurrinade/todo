import { useRef, useState } from "react";

import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { TitlePart, TodoDetailTitleProps } from "@/types";

const TITLE_LINK_PATTERN = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
const TRAILING_LINK_PUNCTUATION_PATTERN = /[),.!?:;]+$/;

export function TodoDetailTitle({ todo, onRenameTodo }: TodoDetailTitleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(todo.title);
  const [isSaving, setIsSaving] = useState(false);
  const shouldSkipBlurSaveRef = useRef(false);

  const startEditing = () => {
    setDraftTitle(todo.title);
    setIsEditing(true);
  };

  const closeEdit = () => {
    setIsEditing(false);
  };

  const handleBlur = async () => {
    if (shouldSkipBlurSaveRef.current) {
      shouldSkipBlurSaveRef.current = false;
      return;
    }

    const nextTitle = draftTitle.trim();

    if (!nextTitle || nextTitle === todo.title) {
      setDraftTitle(todo.title);
      closeEdit();
      return;
    }

    setIsSaving(true);

    try {
      await onRenameTodo(nextTitle);
      closeEdit();
    } catch {
      // The parent owns user-facing error state.
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    shouldSkipBlurSaveRef.current = true;
    setDraftTitle(todo.title);
    closeEdit();
  };

  if (isEditing) {
    return (
      <Textarea
        aria-label="Todo title"
        autoFocus
        disabled={isSaving}
        value={draftTitle}
        onBlur={() => {
          void handleBlur();
        }}
        onChange={(event) => {
          setDraftTitle(event.target.value);
        }}
        onFocus={(event) => {
          const titleLength = event.currentTarget.value.length;

          event.currentTarget.setSelectionRange(titleLength, titleLength);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.blur();
            return;
          }

          if (event.key === "Escape") {
            event.preventDefault();
            handleCancel();
          }
        }}
        rows={1}
        className="min-h-12 resize-none overflow-hidden whitespace-pre-wrap border-none bg-transparent! p-0 text-2xl! font-semibold leading-tight shadow-none outline-none wrap-anywhere [word-break:break-word] focus-visible:ring-0"
      />
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Edit todo title"
      onClick={startEditing}
      onKeyDown={(event) => {
        if (event.target instanceof HTMLElement && event.target.closest("a")) {
          return;
        }

        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          startEditing();
        }
      }}
      className={cn(
        "min-h-12 w-full cursor-text rounded-md text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
        todo.isCompleted ? "text-muted-foreground" : "text-foreground",
      )}
    >
      <h1
        className={cn(
          "whitespace-pre-wrap text-2xl font-semibold leading-tight wrap-anywhere [word-break:break-word]",
          todo.isCompleted && "line-through",
        )}
      >
        {getTitleParts(todo.title).map((part, index) =>
          part.type === "link" ? (
            <a
              key={`${part.value}-${index}`}
              href={
                (part as { type: "link"; value: string; href: string }).href
              }
              target="_blank"
              rel="noreferrer"
              onClick={(event) => {
                event.stopPropagation();
              }}
              className="cursor-pointer text-primary underline underline-offset-4 text-2xl"
            >
              {part.value}
            </a>
          ) : (
            <span key={`${part.value}-${index}`}>{part.value}</span>
          ),
        )}
      </h1>
    </div>
  );
}

function getTitleParts(title: string) {
  const parts: TitlePart[] = [];
  let lastIndex = 0;

  for (const match of title.matchAll(TITLE_LINK_PATTERN)) {
    const value = match[0];
    const index = match.index ?? 0;

    if (index > lastIndex) {
      parts.push({
        type: "text",
        value: title.slice(lastIndex, index),
      });
    }

    const trailingPunctuation = value.match(TRAILING_LINK_PUNCTUATION_PATTERN);
    const linkValue = trailingPunctuation
      ? value.slice(0, -trailingPunctuation[0].length)
      : value;

    parts.push({
      type: "link",
      value: linkValue,
      href: getLinkHref(linkValue),
    });

    if (trailingPunctuation) {
      parts.push({
        type: "text",
        value: trailingPunctuation[0],
      });
    }

    lastIndex = index + value.length;
  }

  if (lastIndex < title.length) {
    parts.push({
      type: "text",
      value: title.slice(lastIndex),
    });
  }

  return parts.length > 0 ? parts : [{ type: "text", value: title }];
}

function getLinkHref(value: string) {
  return value.startsWith("www.") ? `https://${value}` : value;
}
