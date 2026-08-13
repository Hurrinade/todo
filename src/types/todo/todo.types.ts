import type { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { FunctionArgs, FunctionReturnType } from "convex/server";
import type { ReactNode, RefObject } from "react";

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
  FunctionArgs<typeof api.mutations.todos.updateDescription>["description"]
>;

export type TodoListMember = FunctionReturnType<
  typeof api.queries.todoLists.members
>[number];

export type TodoListSummary = FunctionReturnType<
  typeof api.queries.todoLists.list
>[number];

export type TodoListItem = FunctionReturnType<
  typeof api.queries.todos.listOpen
>[number];

export type TodoCompletedPage = FunctionReturnType<
  typeof api.queries.todos.listCompleted
>;

export type TodoRepositionArgs = FunctionArgs<
  typeof api.mutations.todos.reposition
>;

export type TodoTaskListProps = {
  completedTodoCount: number;
  listId: TodoListSummary["_id"];
  openTodos: TodoListItem[];
  scrollElementRef: RefObject<HTMLDivElement | null>;
  onToggleTodo: (todoId: TodoListItem["_id"]) => void;
  onDeleteTodo: (todoId: TodoListItem["_id"]) => void;
  onRepositionTodo: (
    todoId: TodoRepositionArgs["todoId"],
    anchorTodoId: TodoRepositionArgs["anchorTodoId"],
    placement: TodoRepositionArgs["placement"],
  ) => Promise<void>;
};

export type TodoPaginationErrorBoundaryProps = {
  children: ReactNode;
  onRetry: () => void;
};

export type TodoPaginationErrorBoundaryState = {
  hasError: boolean;
};

export type TodoVirtualRow =
  | { key: string; type: "completed-header" }
  | { key: string; type: "loading" }
  | { key: string; type: "open" | "completed"; todo: TodoListItem };

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
