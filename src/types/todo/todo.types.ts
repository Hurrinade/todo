import type { Id } from "@convex/_generated/dataModel";

export type TodoFilter = "all" | "open" | "completed";

export type TodoListWithStats = {
  _id: Id<"todoLists">;
  _creationTime: number;
  title: string;
  userId: string;
  createdAt: number;
  updatedAt: number;
  openTodoCount: number;
  completedTodoCount: number;
};

export type TodoItem = {
  _id: Id<"todos">;
  _creationTime: number;
  listId: Id<"todoLists">;
  title: string;
  isCompleted: boolean;
  completedAt?: number;
  order?: number;
  createdAt: number;
  updatedAt: number;
};
