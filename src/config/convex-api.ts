import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { FunctionReference } from "convex/server";

import type { TodoItem, TodoListWithStats } from "@/types";

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
      remove: FunctionReference<
        "mutation",
        "public",
        { listId: Id<"todoLists"> },
        null
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
    };
  };
};

export const todoApi = api as unknown as TodoApi;
