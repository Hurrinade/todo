import type { Id } from "@convex/_generated/dataModel";
import { create } from "zustand";
import { persist } from "zustand/middleware";

type ShoppingListStoreState = {
  listId: Id<"todoLists"> | null;
  setListId: (listId: Id<"todoLists">) => void;
};

/**
 * The list recipe ingredients are added to, remembered per device so the
 * family picks their shopping list once.
 */
export const useShoppingListStore = create<ShoppingListStoreState>()(
  persist(
    (set) => ({
      listId: null,
      setListId: (listId) => {
        set({ listId });
      },
    }),
    {
      name: "recipe-shopping-list",
      partialize: (state) => ({ listId: state.listId }),
    },
  ),
);
