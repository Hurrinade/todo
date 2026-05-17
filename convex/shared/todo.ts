const MAX_TITLE_LENGTH = 120;

export function normalizeTodoTitle(title: string) {
  const normalizedTitle = title.trim();

  if (!normalizedTitle) {
    throw new Error("Title is required.");
  }

  if (normalizedTitle.length > MAX_TITLE_LENGTH) {
    throw new Error(`Title must be ${MAX_TITLE_LENGTH} characters or less.`);
  }

  return normalizedTitle;
}
