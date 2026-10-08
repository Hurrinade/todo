import type { TodoListSummary } from "@/types/todo/todo.types";

export type TodoStoreState = {
  lists: TodoListSummary[];
  setLists: (lists: TodoListSummary[] | undefined) => void;
};
