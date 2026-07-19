import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useRef } from "react";

import type { TodoNoteContent, TodoNoteEditorProps } from "@/types";

const EMPTY_TODO_NOTE: TodoNoteContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

export function TodoNoteEditor({
  description,
  onUpdateDescription,
}: TodoNoteEditorProps) {
  const lastSavedDescriptionRef = useRef(description);
  const isDirtyRef = useRef(false);

  const editor = useEditor({
    content: description ?? EMPTY_TODO_NOTE,
    extensions: [
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
          "min-h-[45vh] whitespace-pre-wrap px-0 py-2 text-base leading-7 wrap-anywhere outline-none [&_a]:cursor-pointer [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4",
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

  return <EditorContent editor={editor} />;
}
