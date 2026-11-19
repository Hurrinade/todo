import { create } from "zustand";
import { persist } from "zustand/middleware";

import { LANGUAGES, MESSAGES, type Language } from "@/i18n";

type LanguageStoreState = {
  language: Language;
  setLanguage: (language: Language) => void;
};

// The first of the device's preferred languages the app speaks, else English.
function getDeviceLanguage(): Language {
  const preferred = typeof navigator === "undefined" ? [] : navigator.languages;

  for (const tag of preferred) {
    const language = LANGUAGES.find((option) =>
      tag.toLowerCase().startsWith(option),
    );

    if (language) {
      return language;
    }
  }

  return "en";
}

function applyDocumentLanguage(language: Language) {
  if (typeof document !== "undefined") {
    document.documentElement.lang = language;
  }
}

/**
 * The app language, per device like the theme. Follows the device language
 * until someone picks one in the account menu.
 */
export const useLanguageStore = create<LanguageStoreState>()(
  persist(
    (set) => ({
      language: getDeviceLanguage(),
      setLanguage: (language) => {
        set({ language });
      },
    }),
    {
      name: "language",
      partialize: (state) => ({ language: state.language }),
    },
  ),
);

// The app's text outside components, such as in stores. Reads the language
// at call time; components use useT so they re-render on a change.
export function getT() {
  return MESSAGES[useLanguageStore.getState().language];
}

applyDocumentLanguage(useLanguageStore.getState().language);
useLanguageStore.subscribe((state) => {
  applyDocumentLanguage(state.language);
});
