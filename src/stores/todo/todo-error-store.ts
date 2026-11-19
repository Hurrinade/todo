import { create } from "zustand";

import { translateAppError } from "@/i18n";
import { getT } from "@/stores/language/language-store";
import type { TodoErrorStoreState } from "@/types";

export const useTodoErrorStore = create<TodoErrorStoreState>((set) => ({
  errorMessage: null,
  setErrorMessage: (message) => {
    set({ errorMessage: message });
  },
  clearErrorMessage: () => {
    set({ errorMessage: null });
  },
  setUnknownErrorMessage: (error) => {
    // Server errors without an app message are internal, so keep them generic.
    const t = getT();

    set({
      errorMessage: translateAppError(error, t) ?? t.common.somethingWentWrong,
    });
  },
}));
