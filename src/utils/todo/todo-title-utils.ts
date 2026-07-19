import type { TodoTitleContent } from "@/types";

export function createTodoTitleContent(title: string): TodoTitleContent {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: title.trim(),
          },
        ],
      },
    ],
  };
}

export function getTodoTitleText(title: TodoTitleContent) {
  return (title.content[0].content ?? []).map((node) => node.text).join("");
}
