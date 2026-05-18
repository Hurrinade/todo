import type { Id } from "@convex/_generated/dataModel";

export type TodoFilter = "all" | "open" | "completed";
export type TodoWorkspaceLocationState = {
  selectedListId?: Id<"todoLists">;
};

export type TodoListWithStats = {
  _id: Id<"todoLists">;
  _creationTime: number;
  title: string;
  userId: string;
  createdAt: number;
  order?: number;
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

export type TodoInvitePreview = {
  listId: Id<"todoLists">;
  listTitle: string;
  token: string;
  expiresAt: number;
  createdByUserId: string;
  isCurrentUserMember: boolean;
};

export type TodoInviteCreateResult = {
  inviteId: Id<"todoListInvites">;
  token: string;
  expiresAt: number;
  listId: Id<"todoLists">;
};

export type TodoInviteAcceptResult = {
  listId: Id<"todoLists">;
};
