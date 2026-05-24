import type { TodoItem, TodoListWithStats } from "@/types/todo/todo.types";

export type TodoStoreState = {
  currentListId: TodoListWithStats["_id"] | null;
  todosById: Record<string, TodoItem>;
  setCurrentListTodos: (
    listId: TodoListWithStats["_id"],
    todos: TodoItem[],
  ) => void;
  getTodoById: (todoId: TodoItem["_id"]) => TodoItem | null;
};
