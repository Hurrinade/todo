import { MESSAGES } from "@/i18n";
import { useLanguageStore } from "@/stores";

/**
 * The app's text in the chosen language: `const t = useT(); t.common.cancel`.
 * Components re-render when the language changes.
 */
export function useT() {
  return MESSAGES[useLanguageStore((state) => state.language)];
}
