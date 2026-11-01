import { api } from "@convex/_generated/api";
import { usePaginatedQuery } from "convex/react";
import { useCallback } from "react";

import type { TodoListItem } from "@/types";

const COMPLETED_TODO_PAGE_SIZE = 40;

/**
 * Completed todos of a list, newest first, in pages of 40. Regular and
 * sectioned lists share it, so toggle optimistic updates reach both.
 */
export function useCompletedTodos(
  listId: TodoListItem["listId"],
  enabled = true,
) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.queries.todos.listCompleted,
    enabled ? { listId } : "skip",
    { initialNumItems: COMPLETED_TODO_PAGE_SIZE },
  );
  const loadMoreCompleted = useCallback(() => {
    loadMore(COMPLETED_TODO_PAGE_SIZE);
  }, [loadMore]);

  return { results, status, loadMore: loadMoreCompleted };
}
