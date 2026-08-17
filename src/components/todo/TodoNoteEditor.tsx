import { Placeholder } from "@tiptap/extensions";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef } from "react";

import type { TodoNoteContent, TodoNoteEditorProps } from "@/types";
import { useNetworkStore } from "@/stores";

const EMPTY_TODO_NOTE: TodoNoteContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

export function TodoNoteEditor({
  description,
  onUpdateDescription,
}: TodoNoteEditorProps) {
  const isOnline = useNetworkStore((state) => state.isOnline);
  const lastSavedDescriptionRef = useRef(description);
  const isDirtyRef = useRef(false);

  const editor = useEditor({
    content: description ?? EMPTY_TODO_NOTE,
    editable: isOnline,
    extensions: [
      Placeholder.configure({
        placeholder: "Add a note…",
        showOnlyWhenEditable: false,
      }),
      StarterKit.configure({
        link: {
          autolink: true,
          defaultProtocol: "https",
          HTMLAttributes: {
            rel: "noopener noreferrer",
            target: "_blank",
          },
          linkOnPaste: true,
          openOnClick: true,
        },
      }),
    ],
    editorProps: {
      attributes: {
        "aria-label": "Todo note",
        class:
          "min-h-40 whitespace-pre-wrap px-4 py-3 text-base leading-7 wrap-anywhere outline-none sm:min-h-48 [&_.is-editor-empty:first-child::before]:pointer-events-none [&_.is-editor-empty:first-child::before]:float-left [&_.is-editor-empty:first-child::before]:h-0 [&_.is-editor-empty:first-child::before]:text-muted-foreground [&_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_a]:cursor-pointer [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_blockquote]:my-4 [&_blockquote]:border-l-2 [&_blockquote]:border-primary/40 [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground [&_code]:rounded-sm [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-sm [&_h1]:mt-5 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:mt-5 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:font-semibold [&_hr]:my-5 [&_hr]:border-border [&_li+li]:mt-1 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_p+p]:mt-3 [&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6",
        id: "todo-description",
      },
    },
    onUpdate: () => {
      isDirtyRef.current = true;
    },
    onBlur: async ({ editor: currentEditor }) => {
      if (!isDirtyRef.current) {
        return;
      }

      const previousDescription = lastSavedDescriptionRef.current;
      const nextDescription = currentEditor.isEmpty
        ? undefined
        : (currentEditor.getJSON() as TodoNoteContent);

      isDirtyRef.current = false;

      if (
        JSON.stringify(nextDescription) === JSON.stringify(previousDescription)
      ) {
        return;
      }

      try {
        await onUpdateDescription(nextDescription);
        lastSavedDescriptionRef.current = nextDescription;
      } catch {
        if (!currentEditor.isDestroyed) {
          currentEditor.commands.setContent(
            previousDescription ?? EMPTY_TODO_NOTE,
            { emitUpdate: false },
          );
        }
      }
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    if (!isOnline && editor.isFocused) {
      editor.commands.blur();
    }

    editor.setEditable(isOnline);
  }, [editor, isOnline]);

  return (
    <div
      aria-disabled={!isOnline}
      className="cursor-text rounded-lg border border-border bg-card/40 transition-colors hover:border-foreground/25 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30 aria-disabled:cursor-default aria-disabled:opacity-50 aria-disabled:hover:border-border dark:bg-card/30"
    >
      <EditorContent editor={editor} />
    </div>
  );
}
