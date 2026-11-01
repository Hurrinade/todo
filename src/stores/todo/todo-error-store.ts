import { getAppErrorMessage } from "@convex/shared/errors";
import { create } from "zustand";

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
    set({ errorMessage: getAppErrorMessage(error) ?? "Something went wrong." });
  },
}));
