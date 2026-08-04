import dayjs from "dayjs";

import type { Doc } from "../_generated/dataModel";
import { getTodoNoteText, getTodoTitleText } from "../shared/todo";

const SAFE_ERROR_MESSAGES = [
  "Todo was not found.",
  "Todo list was not found.",
  "Section was not found.",
  "Target section was not found.",
  "Sections are only available in sectioned lists.",
  "Regular lists cannot contain sections.",
  "Todo moves are only available in sectioned lists.",
  "Todo is missing its section.",
  "Default section was not found.",
  "The default Other section cannot be renamed.",
  "Provide a title or description to update.",
  "Title is required.",
  "Section title is required.",
  "Title must be 240 characters or less.",
  "Section title must be 240 characters or less.",
  "Description must be 10000 characters or less.",
  "List emoji must be 16 characters or less.",
];

export function formatTodoList(record: {
  list: Doc<"todoLists">;
  sections: Doc<"todoSections">[];
  openTodoCount: number;
  completedTodoCount: number;
}) {
  return {
    id: record.list._id,
    title: record.list.title,
    emoji: record.list.emoji ?? null,
    kind: record.list.kind,
    open_todo_count: record.openTodoCount,
    completed_todo_count: record.completedTodoCount,
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

export function formatTodo(record: {
  todo: Doc<"todos">;
  list: Doc<"todoLists">;
  section: Doc<"todoSections"> | null;
}) {
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

export function createToolResult(data: Record<string, unknown>) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data) }],
    structuredContent: data,
  };
}

export async function runMcpTool(
  operation: () => Promise<Record<string, unknown>>,
) {
  try {
    return createToolResult(await operation());
  } catch (error) {
    const message = getSafeMcpErrorMessage(error);

    return {
      content: [{ type: "text" as const, text: message }],
      isError: true,
    };
  }
}

export function getSafeMcpErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const safeMessage = SAFE_ERROR_MESSAGES.find((candidate) =>
    message.includes(candidate),
  );

  return safeMessage ?? "The RiTodo operation could not be completed.";
}

function formatTimestamp(value: number) {
  return dayjs(value).toISOString();
}
