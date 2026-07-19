import { v, type Infer } from "convex/values";

const MAX_TITLE_LENGTH = 240;
const MAX_DESCRIPTION_LENGTH = 10000;
const MAX_LIST_EMOJI_LENGTH = 16;
export const DEFAULT_TODO_SECTION_TITLE = "Other";

export const todoNoteContentValidator = v.object({
  type: v.literal("doc"),
  content: v.array(v.any()),
});

export function normalizeTodoTitle(title: string) {
  return normalizeTitle(title, "Title");
}

export function normalizeTodoDescription(
  description: Infer<typeof todoNoteContentValidator> | undefined,
) {
  if (description === undefined) {
    return undefined;
  }

  const descriptionLength = getTodoNoteTextLength(description);

  if (descriptionLength > MAX_DESCRIPTION_LENGTH) {
    throw new Error(
      `Description must be ${MAX_DESCRIPTION_LENGTH} characters or less.`,
    );
  }

  return description;
}

export function normalizeTodoListEmoji(emoji: string) {
  const normalizedEmoji = emoji.trim();

  if (normalizedEmoji.length > MAX_LIST_EMOJI_LENGTH) {
    throw new Error(
      `List emoji must be ${MAX_LIST_EMOJI_LENGTH} characters or less.`,
    );
  }

  return normalizedEmoji;
}

export function normalizeSectionTitle(title: string) {
  return normalizeTitle(title, "Section title");
}

function normalizeTitle(title: string, label: string) {
  const normalizedTitle = title.trim();

  if (!normalizedTitle) {
    throw new Error(`${label} is required.`);
  }

  if (normalizedTitle.length > MAX_TITLE_LENGTH) {
    throw new Error(`${label} must be ${MAX_TITLE_LENGTH} characters or less.`);
  }

  return normalizedTitle;
}

function getTodoNoteTextLength(node: unknown): number {
  if (!isRecord(node) || typeof node.type !== "string") {
    throw new Error("Description contains an invalid node.");
  }

  const attrs = node.attrs;
  const content = node.content;
  const marks = node.marks;
  const text = node.text;

  if (attrs !== undefined && !isRecord(attrs)) {
    throw new Error("Description contains invalid node attributes.");
  }

  if (text !== undefined && typeof text !== "string") {
    throw new Error("Description contains invalid text.");
  }

  if (content !== undefined && !Array.isArray(content)) {
    throw new Error("Description contains invalid nested content.");
  }

  if (marks !== undefined && !Array.isArray(marks)) {
    throw new Error("Description contains invalid text marks.");
  }

  if (text !== undefined && content !== undefined) {
    throw new Error(
      "Description nodes cannot contain text and nested content.",
    );
  }

  const textValue = typeof text === "string" ? text : "";
  const contentValue = Array.isArray(content) ? content : [];
  const marksValue = Array.isArray(marks) ? marks : [];
  let textLength = textValue.length;

  for (const child of contentValue) {
    textLength += getTodoNoteTextLength(child);
  }

  for (const mark of marksValue) {
    validateTodoNoteMark(mark);
  }

  return textLength;
}

function validateTodoNoteMark(mark: unknown) {
  if (!isRecord(mark) || typeof mark.type !== "string") {
    throw new Error("Description contains an invalid text mark.");
  }

  if (mark.attrs !== undefined && !isRecord(mark.attrs)) {
    throw new Error("Description contains invalid text mark attributes.");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
