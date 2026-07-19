import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useRef, useState, type KeyboardEvent } from "react";

import { cn } from "@/lib/utils";
import type { TodoDetailTitleProps, TodoTitleContent } from "@/types";
import { getTodoTitleText } from "@/utils";

export function TodoDetailTitle({ todo, onRenameTodo }: TodoDetailTitleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const isDirtyRef = useRef(false);
  const shouldSkipBlurSaveRef = useRef(false);
  const lastSavedTitleRef = useRef({
    title: todo.title,
    serializedTitle: JSON.stringify(todo.title),
  });

  const editor = useEditor({
    content: todo.title,
    editable: false,
    extensions: [
      StarterKit.configure({
        blockquote: false,
        bold: false,
        bulletList: false,
        code: false,
        codeBlock: false,
        dropcursor: false,
        gapcursor: false,
        hardBreak: false,
        heading: false,
        horizontalRule: false,
        italic: false,
        listItem: false,
        listKeymap: false,
        link: {
          autolink: true,
          defaultProtocol: "https",
          HTMLAttributes: {
            rel: "noopener noreferrer",
            target: "_blank",
          },
          isAllowedUri: (url, context) => {
            if (!context.defaultValidate(url)) {
              return false;
            }

            try {
              const parsedUrl = new URL(url, "https://example.com");

              return (
                parsedUrl.protocol === "http:" ||
                parsedUrl.protocol === "https:"
              );
            } catch {
              return false;
            }
          },
          linkOnPaste: true,
          openOnClick: true,
        },
        orderedList: false,
        strike: false,
        trailingNode: false,
        underline: false,
      }),
    ],
    editorProps: {
      attributes: {
        "aria-label": "Todo title",
        class:
          "min-h-12 whitespace-pre-wrap text-2xl font-semibold leading-tight wrap-anywhere outline-none [word-break:break-word] [&_a]:cursor-pointer [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4",
      },
      handleKeyDown: (_view, event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          editor?.commands.blur();
          return true;
        }

        if (event.key === "Escape") {
          event.preventDefault();
          restoreLastSavedTitle();
          editor?.commands.blur();
          return true;
        }

        return false;
      },
      handlePaste: (view, event) => {
        const pastedText = event.clipboardData?.getData("text/plain");

        if (!pastedText || !/[\r\n]/.test(pastedText)) {
          return false;
        }

        event.preventDefault();
        view.dispatch(view.state.tr.insertText(getPlainTitle(pastedText)));
        return true;
      },
    },
    onCreate: ({ editor: currentEditor }) => {
      lastSavedTitleRef.current.serializedTitle = JSON.stringify(
        currentEditor.getJSON(),
      );
    },
    onUpdate: () => {
      isDirtyRef.current = true;
    },
    onBlur: async ({ editor: currentEditor }) => {
      if (shouldSkipBlurSaveRef.current) {
        shouldSkipBlurSaveRef.current = false;
        closeEditor(currentEditor);
        return;
      }

      if (!isDirtyRef.current) {
        closeEditor(currentEditor);
        return;
      }

      const previousTitle = lastSavedTitleRef.current;
      const nextTitle = currentEditor.getJSON() as unknown as TodoTitleContent;
      const nextTitleText = getTodoTitleText(nextTitle);
      const serializedNextTitle = JSON.stringify(nextTitle);

      isDirtyRef.current = false;

      if (!nextTitleText.trim()) {
        currentEditor.commands.setContent(previousTitle.title, {
          emitUpdate: false,
        });
        closeEditor(currentEditor);
        return;
      }

      if (serializedNextTitle === previousTitle.serializedTitle) {
        closeEditor(currentEditor);
        return;
      }

      setIsSaving(true);

      try {
        await onRenameTodo(nextTitle);
        lastSavedTitleRef.current = {
          title: nextTitle,
          serializedTitle: serializedNextTitle,
        };
      } catch {
        if (!currentEditor.isDestroyed) {
          currentEditor.commands.setContent(previousTitle.title, {
            emitUpdate: false,
          });
        }
      } finally {
        if (!currentEditor.isDestroyed) {
          closeEditor(currentEditor);
        }

        setIsSaving(false);
      }
    },
  });

  const startEditing = () => {
    if (!editor || isEditing || isSaving) {
      return;
    }

    editor.setEditable(true);
    setIsEditing(true);
    editor.commands.focus("end");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!editor) {
      return;
    }

    if (!isEditing) {
      if (event.target instanceof HTMLElement && event.target.closest("a")) {
        return;
      }

      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        startEditing();
      }

      return;
    }
  };

  return (
    <div
      role={isEditing ? undefined : "button"}
      tabIndex={isEditing ? -1 : 0}
      aria-label={isEditing ? undefined : "Edit todo title"}
      aria-busy={isSaving}
      onClick={(event) => {
        if (event.target instanceof HTMLElement && event.target.closest("a")) {
          return;
        }

        startEditing();
      }}
      onKeyDown={handleKeyDown}
      className={cn(
        "min-h-12 w-full cursor-text rounded-md text-left outline-none focus-within:ring-3 focus-within:ring-ring/40 focus-visible:ring-3 focus-visible:ring-ring/40",
        todo.isCompleted
          ? "text-muted-foreground line-through"
          : "text-foreground",
      )}
    >
      <EditorContent editor={editor} />
    </div>
  );

  function closeEditor(currentEditor: NonNullable<typeof editor>) {
    currentEditor.setEditable(false);
    setIsEditing(false);
  }

  function restoreLastSavedTitle() {
    shouldSkipBlurSaveRef.current = true;
    isDirtyRef.current = false;
    editor?.commands.setContent(lastSavedTitleRef.current.title, {
      emitUpdate: false,
    });
  }
}

function getPlainTitle(title: string) {
  return title.replace(/\s+/g, " ").trim();
}
