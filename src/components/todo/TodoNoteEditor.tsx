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
    <div aria-disabled={!isOnline}>
      <EditorContent editor={editor} />
    </div>
  );
}
