import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { FunctionReference } from "convex/server";

import type {
  TodoInviteAcceptResult,
  TodoInviteCreateResult,
  TodoInvitePreview,
  TodoItem,
  TodoListWithStats,
} from "@/types";

type TodoApi = {
  queries: {
    todoLists: {
      list: FunctionReference<
        "query",
        "public",
        Record<string, never>,
        TodoListWithStats[]
      >;
    };
    todoInvites: {
      getByToken: FunctionReference<
        "query",
        "public",
        { token: string },
        TodoInvitePreview | null
      >;
    };
    todos: {
      list: FunctionReference<
        "query",
        "public",
        { listId: Id<"todoLists"> },
        TodoItem[]
      >;
    };
  };
  mutations: {
    todoLists: {
      create: FunctionReference<
        "mutation",
        "public",
        { title: string },
        Id<"todoLists">
      >;
      rename: FunctionReference<
        "mutation",
        "public",
        { listId: Id<"todoLists">; title: string },
        null
      >;
      reorder: FunctionReference<
        "mutation",
        "public",
        { listIds: Id<"todoLists">[] },
        null
      >;
      remove: FunctionReference<
        "mutation",
        "public",
        { listId: Id<"todoLists"> },
        null
      >;
    };
    todoInvites: {
      create: FunctionReference<
        "mutation",
        "public",
        { listId: Id<"todoLists"> },
        TodoInviteCreateResult
      >;
      accept: FunctionReference<
        "mutation",
        "public",
        { token: string },
        TodoInviteAcceptResult
      >;
    };
    todos: {
      create: FunctionReference<
        "mutation",
        "public",
        { listId: Id<"todoLists">; title: string },
        Id<"todos">
      >;
      toggle: FunctionReference<
        "mutation",
        "public",
        { todoId: Id<"todos"> },
        null
      >;
      rename: FunctionReference<
        "mutation",
        "public",
        { todoId: Id<"todos">; title: string },
        null
      >;
      remove: FunctionReference<
        "mutation",
        "public",
        { todoId: Id<"todos"> },
        null
      >;
      clearCompleted: FunctionReference<
        "mutation",
        "public",
        { listId: Id<"todoLists"> },
        null
      >;
      uncheckCompleted: FunctionReference<
        "mutation",
        "public",
        { listId: Id<"todoLists"> },
        null
      >;
      reorder: FunctionReference<
        "mutation",
        "public",
        { listId: Id<"todoLists">; todoIds: Id<"todos">[] },
        null
      >;
    };
  };
};

export const todoApi = api as unknown as TodoApi;
