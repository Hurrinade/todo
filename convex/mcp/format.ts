import dayjs from "dayjs";
import { z } from "zod";

import type { Doc } from "../_generated/dataModel";
import { getAppErrorMessage } from "../shared/errors";
import { getTodoNoteText, getTodoTitleText } from "../shared/todo";
import type { TodoRecord } from "../shared/todoRecord";

export const todoOutputSchema = z.object({
  id: z.string(),
  list_id: z.string(),
  list_title: z.string(),
  section_id: z.string().nullable(),
  section_title: z.string().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  completed: z.boolean(),
  completed_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const todoListOutputSchema = z.object({
  id: z.string(),
  title: z.string(),
  emoji: z.string().nullable(),
  kind: z.enum(["regular", "sectioned"]),
  open_todo_count: z.number(),
  completed_todo_count: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
  sections: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      is_default: z.boolean(),
      created_at: z.string(),
      updated_at: z.string(),
    }),
  ),
});

export function formatTodoList(record: {
  list: Doc<"todoLists">;
  sections: Doc<"todoSections">[];
}): z.output<typeof todoListOutputSchema> {
  return {
    id: record.list._id,
    title: record.list.title,
    emoji: record.list.emoji ?? null,
    kind: record.list.kind,
    open_todo_count: record.list.openTodoCount,
    completed_todo_count: record.list.completedTodoCount,
    created_at: formatTimestamp(record.list._creationTime),
    updated_at: formatTimestamp(record.list.updatedAt),
    sections: record.sections.map((section) => ({
      id: section._id,
      title: section.title,
      is_default: section.isDefault,
      created_at: formatTimestamp(section._creationTime),
      updated_at: formatTimestamp(section.updatedAt),
    })),
  };
}

export function formatTodo(
  record: TodoRecord,
): z.output<typeof todoOutputSchema> {
  return {
    id: record.todo._id,
    list_id: record.list._id,
    list_title: record.list.title,
    section_id: record.section?._id ?? null,
    section_title: record.section?.title ?? null,
    title: getTodoTitleText(record.todo.title),
    description: getTodoNoteText(record.todo.description) ?? null,
    completed: record.todo.isCompleted,
    completed_at: record.todo.completedAt
      ? formatTimestamp(record.todo.completedAt)
      : null,
    created_at: formatTimestamp(record.todo._creationTime),
    updated_at: formatTimestamp(record.todo.updatedAt),
  };
}

// Wraps a tool body: data becomes structured content, and only app errors
// keep their message so internal details never reach the agent.
export async function runMcpTool(
  operation: () => Promise<Record<string, unknown>>,
) {
  try {
    const data = await operation();

    return {
      content: [{ type: "text" as const, text: JSON.stringify(data) }],
      structuredContent: data,
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text" as const,
          text:
            getAppErrorMessage(error) ??
            "The RiTodo operation could not be completed.",
        },
      ],
      isError: true,
    };
  }
}

function formatTimestamp(value: number) {
  return dayjs(value).toISOString();
}
