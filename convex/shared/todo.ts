const MAX_TITLE_LENGTH = 240;
const MAX_DESCRIPTION_LENGTH = 10000;
const MAX_LIST_EMOJI_LENGTH = 16;
export const DEFAULT_TODO_SECTION_TITLE = "Other";

export function normalizeTodoTitle(title: string) {
  return normalizeTitle(title, "Title");
}

export function normalizeTodoDescription(description: string) {
  const normalizedDescription = description.trim();

  if (normalizedDescription.length > MAX_DESCRIPTION_LENGTH) {
    throw new Error(
      `Description must be ${MAX_DESCRIPTION_LENGTH} characters or less.`,
    );
  }

  return normalizedDescription;
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
