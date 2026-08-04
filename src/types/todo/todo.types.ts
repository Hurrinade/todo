import type { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { FunctionArgs, FunctionReturnType } from "convex/server";

export type TodoListKind = FunctionArgs<
  typeof api.mutations.todoLists.create
>["kind"];

export type TodoWorkspaceLocationState = {
  selectedListId?: Id<"todoLists">;
};

export type TodoTitleContent = FunctionArgs<
  typeof api.mutations.todos.create
>["title"];

export type TodoNoteContent = NonNullable<
  FunctionArgs<
    typeof api.mutations.todos.updateDescription
  >["description"]
>;

export type TodoListMember = FunctionReturnType<
  typeof api.queries.todoLists.members
>[number];

export type TodoListSummary = FunctionReturnType<
  typeof api.queries.todoLists.list
>[number];

export type TodoListItem = FunctionReturnType<
  typeof api.queries.todos.list
>[number];

export type TodoDetail = NonNullable<
  FunctionReturnType<typeof api.queries.todos.get>
>;

export type TodoItem = TodoDetail["todo"];

export type TodoSection = FunctionReturnType<
  typeof api.queries.todoSections.list
>[number];

export type TodoInvitePreview = NonNullable<
  FunctionReturnType<typeof api.queries.todoInvites.getByToken>
>;

export type TodoInviteCreateResult = FunctionReturnType<
  typeof api.mutations.todoInvites.create
>;

export type TodoInviteAcceptResult = FunctionReturnType<
  typeof api.mutations.todoInvites.accept
>;
