import { getAppErrorKey, getAppErrorMessage } from "@convex/shared/errors";

import { en, type Messages } from "@/i18n/en";
import { hr } from "@/i18n/hr";

export type { Messages };

export const LANGUAGES = ["en", "hr"] as const;

export type Language = (typeof LANGUAGES)[number];

export const MESSAGES: Record<Language, Messages> = { en, hr };

/**
 * The message to show for a failed Convex call: the translation of its error
 * key, or in English the server's own message. Null for errors without one,
 * so callers fall back to their own translated text.
 */
export function translateAppError(error: unknown, t: Messages) {
  const key = getAppErrorKey(error);

  if (key) {
    return t.errors[key];
  }

  return t.language === "en" ? getAppErrorMessage(error) : null;
}

/**
 * Messages from services that only speak English, such as sign-in: shown in
 * English, replaced by the app's own fallback in other languages.
 */
export function translateServerMessage(
  t: Messages,
  message: string | undefined,
  fallback: string,
) {
  return t.language === "en" ? (message ?? fallback) : fallback;
}
