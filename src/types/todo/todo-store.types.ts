import type { TodoItem, TodoListWithStats } from "@/types/todo/todo.types";

export type TodoStoreState = {
  lists: TodoListWithStats[];
  setLists: (lists: TodoListWithStats[] | undefined) => void;
  todosById: Record<string, TodoItem>;
  setCurrentListTodos: (todos: TodoItem[]) => void;
  getTodoById: (todoId: TodoItem["_id"]) => TodoItem | null;
};
