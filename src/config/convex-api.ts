import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { FunctionReference } from "convex/server";

import type {
  TodoInviteAcceptResult,
  TodoInviteCreateResult,
  TodoInvitePreview,
  TodoItem,
  TodoListKind,
  TodoListWithStats,
  TodoNoteContent,
  TodoSection,
  TodoTitleContent,
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
    todoSections: {
      list: FunctionReference<
        "query",
        "public",
        { listId: Id<"todoLists"> },
        TodoSection[]
      >;
    };
    todos: {
      get: FunctionReference<
        "query",
        "public",
        { todoId: Id<"todos"> },
        TodoItem | null
      >;
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
        { title: string; emoji?: string; kind: TodoListKind },
        Id<"todoLists">
      >;
      rename: FunctionReference<
        "mutation",
        "public",
        { listId: Id<"todoLists">; title: string },
        null
      >;
      updateEmoji: FunctionReference<
        "mutation",
        "public",
        { listId: Id<"todoLists">; emoji: string },
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
    todoSections: {
      create: FunctionReference<
        "mutation",
        "public",
        { listId: Id<"todoLists">; title: string },
        Id<"todoSections">
      >;
      rename: FunctionReference<
        "mutation",
        "public",
        { sectionId: Id<"todoSections">; title: string },
        null
      >;
      reorder: FunctionReference<
        "mutation",
        "public",
        { listId: Id<"todoLists">; sectionIds: Id<"todoSections">[] },
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
        { listId: Id<"todoLists">; title: TodoTitleContent },
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
        { todoId: Id<"todos">; title: TodoTitleContent },
        null
      >;
      updateDescription: FunctionReference<
        "mutation",
        "public",
        { todoId: Id<"todos">; description?: TodoNoteContent },
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
      move: FunctionReference<
        "mutation",
        "public",
        {
          todoId: Id<"todos">;
          targetSectionId: Id<"todoSections">;
          targetIndex: number;
        },
        null
      >;
    };
  };
};

export const todoApi = api as unknown as TodoApi;
