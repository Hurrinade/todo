import { create } from "zustand";

import type { TodoItem, TodoStoreState } from "@/types";

export const useTodoStore = create<TodoStoreState>((set, get) => ({
  lists: [],
  setLists: (lists) => {
    set({ lists: lists ?? [] });
  },
  todosById: {},
  setCurrentListTodos: (todos) => {
    set({
      todosById: buildTodoMap(todos),
    });
  },
  getTodoById: (todoId) => get().todosById[todoId] ?? null,
}));

function buildTodoMap(todos: TodoItem[]) {
  return todos.reduce<Record<string, TodoItem>>((todosById, todo) => {
    todosById[todo._id] = todo;

    return todosById;
  }, {});
}
