import { create } from "zustand";

import type { TodoStoreState } from "@/types";

export const useTodoStore = create<TodoStoreState>((set) => ({
  lists: [],
  setLists: (lists) => {
    set({ lists: lists ?? [] });
  },
}));
