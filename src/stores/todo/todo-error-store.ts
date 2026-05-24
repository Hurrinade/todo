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
    set({ errorMessage: getErrorMessage(error) });
  },
}));

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong.";
}
