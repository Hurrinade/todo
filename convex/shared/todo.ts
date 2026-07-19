import { v, type Infer } from "convex/values";

const MAX_TITLE_LENGTH = 240;
const MAX_TITLE_CONTENT_LENGTH = 10000;
const MAX_DESCRIPTION_LENGTH = 10000;
const MAX_LIST_EMOJI_LENGTH = 16;
export const DEFAULT_TODO_SECTION_TITLE = "Other";

const todoTitleLinkAttributesValidator = v.object({
  href: v.string(),
  target: v.optional(v.union(v.literal("_blank"), v.null())),
  rel: v.optional(v.union(v.literal("noopener noreferrer"), v.null())),
  class: v.optional(v.null()),
  title: v.optional(v.union(v.string(), v.null())),
});

const todoTitleLinkMarkValidator = v.object({
  type: v.literal("link"),
  attrs: todoTitleLinkAttributesValidator,
});

const todoTitleTextNodeValidator = v.object({
  type: v.literal("text"),
  marks: v.optional(v.array(todoTitleLinkMarkValidator)),
  text: v.string(),
});

const todoTitleParagraphNodeValidator = v.object({
  type: v.literal("paragraph"),
  content: v.optional(v.array(todoTitleTextNodeValidator)),
});

export const todoTitleContentValidator = v.object({
  type: v.literal("doc"),
  content: v.array(todoTitleParagraphNodeValidator),
});

export const todoNoteContentValidator = v.object({
  type: v.literal("doc"),
  content: v.array(v.any()),
});

export function normalizeTodoTitle(title: string) {
  return normalizeTitle(title, "Title");
}

export function createTodoTitleContent(
  title: string,
): Infer<typeof todoTitleContentValidator> {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: normalizeTodoTitle(title),
          },
        ],
      },
    ],
  };
}

export function normalizeTodoTitleContent(
  title: Infer<typeof todoTitleContentValidator>,
) {
  if (JSON.stringify(title).length > MAX_TITLE_CONTENT_LENGTH) {
    throw new Error(
      `Title content must be ${MAX_TITLE_CONTENT_LENGTH} characters or less.`,
    );
  }

  if (title.content.length !== 1) {
    throw new Error("Title must contain exactly one paragraph.");
  }

  const paragraph = title.content[0];
  const textNodes = paragraph.content ?? [];
  let titleText = "";

  for (const node of textNodes) {
    if (/[\r\n]/.test(node.text)) {
      throw new Error("Title must be a single line.");
    }

    titleText += node.text;

    if ((node.marks?.length ?? 0) > 1) {
      throw new Error("Title text can contain only one link mark.");
    }

    for (const mark of node.marks ?? []) {
      validateTodoTitleLink(mark.attrs.href);
    }
  }

  if (!titleText.trim()) {
    throw new Error("Title is required.");
  }

  if (titleText.length > MAX_TITLE_LENGTH) {
    throw new Error(`Title must be ${MAX_TITLE_LENGTH} characters or less.`);
  }

  return title;
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

function validateTodoTitleLink(href: string) {
  try {
    const url = new URL(href);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("Title links must use HTTP or HTTPS.");
    }
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Title links must use HTTP or HTTPS."
    ) {
      throw error;
    }

    throw new Error("Title contains an invalid link.");
  }
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
