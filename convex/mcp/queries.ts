import { v } from "convex/values";

import type { Doc, Id } from "../_generated/dataModel";
import { internalQuery, type QueryCtx } from "../_generated/server";
import { requireListAccess } from "../shared/auth";

export const listTodoLists = internalQuery({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const lists = await getAccessibleLists(ctx, args.userId);

    return Promise.all(
      lists.map(async (list) => {
        const [openTodos, completedTodos, sections] = await Promise.all([
          ctx.db
            .query("todos")
            .withIndex("by_list_id_and_completed", (q) =>
              q.eq("listId", list._id).eq("isCompleted", false),
            )
            .collect(),
          ctx.db
            .query("todos")
            .withIndex("by_list_id_and_completed", (q) =>
              q.eq("listId", list._id).eq("isCompleted", true),
            )
            .collect(),
          ctx.db
            .query("todoSections")
            .withIndex("by_list_id", (q) => q.eq("listId", list._id))
            .collect(),
        ]);

        return {
          list,
          sections: sections.sort(compareSections),
          openTodoCount: openTodos.length,
          completedTodoCount: completedTodos.length,
        };
      }),
    );
  },
});

export const listTodos = internalQuery({
  args: {
    userId: v.string(),
    listId: v.optional(v.id("todoLists")),
    sectionId: v.optional(v.id("todoSections")),
    completed: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const lists = await resolveTodoLists(ctx, args);
    const todoGroups = await Promise.all(
      lists.map(async (list) => {
        const todos = await getTodos(ctx, list._id, args);
        const sections = await ctx.db
          .query("todoSections")
          .withIndex("by_list_id", (q) => q.eq("listId", list._id))
          .collect();
        const sectionsById = new Map(
          sections.map((section) => [section._id, section]),
        );

        return todos.sort(compareTodos).map((todo) => ({
          todo,
          list,
          section: todo.sectionId
            ? (sectionsById.get(todo.sectionId) ?? null)
            : null,
        }));
      }),
    );

    return todoGroups.flat();
  },
});

export const getTodo = internalQuery({
  args: {
    userId: v.string(),
    todoId: v.id("todos"),
  },
  handler: async (ctx, args) => {
    const todo = await ctx.db.get(args.todoId);

    if (!todo) {
      throw new Error("Todo was not found.");
    }

    await requireListAccess(ctx, todo.listId, args.userId);
    const [list, section] = await Promise.all([
      ctx.db.get(todo.listId),
      todo.sectionId ? ctx.db.get(todo.sectionId) : null,
    ]);

    if (!list) {
      throw new Error("Todo list was not found.");
    }

    return { todo, list, section };
  },
});

async function getAccessibleLists(ctx: QueryCtx, userId: string) {
  const memberships = await ctx.db
    .query("todoListUsers")
    .withIndex("by_user_id", (q) => q.eq("userId", userId))
    .collect();
  const lists = await Promise.all(
    memberships.map((membership) => ctx.db.get(membership.listId)),
  );

  return lists
    .filter((list): list is Doc<"todoLists"> => list !== null)
    .sort(compareLists);
}

async function resolveTodoLists(
  ctx: QueryCtx,
  args: {
    userId: string;
    listId?: Id<"todoLists">;
    sectionId?: Id<"todoSections">;
  },
) {
  if (args.sectionId) {
    const section = await ctx.db.get(args.sectionId);

    if (!section || (args.listId && section.listId !== args.listId)) {
      throw new Error("Section was not found.");
    }

    await requireListAccess(ctx, section.listId, args.userId);
    const list = await ctx.db.get(section.listId);

    if (!list) {
      throw new Error("Todo list was not found.");
    }

    return [list];
  }

  if (args.listId) {
    await requireListAccess(ctx, args.listId, args.userId);
    const list = await ctx.db.get(args.listId);

    if (!list) {
      throw new Error("Todo list was not found.");
    }

    return [list];
  }

  return getAccessibleLists(ctx, args.userId);
}

async function getTodos(
  ctx: QueryCtx,
  listId: Id<"todoLists">,
  args: {
    sectionId?: Id<"todoSections">;
    completed?: boolean;
  },
) {
  if (args.sectionId && args.completed !== undefined) {
    return ctx.db
      .query("todos")
      .withIndex("by_section_id_and_completed", (q) =>
        q.eq("sectionId", args.sectionId).eq("isCompleted", args.completed!),
      )
      .collect();
  }

  if (args.sectionId) {
    return ctx.db
      .query("todos")
      .withIndex("by_section_id", (q) => q.eq("sectionId", args.sectionId))
      .collect();
  }

  if (args.completed !== undefined) {
    return ctx.db
      .query("todos")
      .withIndex("by_list_id_and_completed", (q) =>
        q.eq("listId", listId).eq("isCompleted", args.completed!),
      )
      .collect();
  }

  return ctx.db
    .query("todos")
    .withIndex("by_list_id", (q) => q.eq("listId", listId))
    .collect();
}

function compareLists(first: Doc<"todoLists">, second: Doc<"todoLists">) {
  if (first.order !== undefined && second.order !== undefined) {
    return first.order - second.order;
  }

  if (first.order !== undefined) {
    return -1;
  }

  if (second.order !== undefined) {
    return 1;
  }

  if (first.updatedAt !== second.updatedAt) {
    return second.updatedAt - first.updatedAt;
  }

  return second._creationTime - first._creationTime;
}

function compareSections(
  first: Doc<"todoSections">,
  second: Doc<"todoSections">,
) {
  if (first.order !== undefined && second.order !== undefined) {
    return first.order - second.order;
  }

  if (first.order !== undefined) {
    return -1;
  }

  if (second.order !== undefined) {
    return 1;
  }

  return first._creationTime - second._creationTime;
}

function compareTodos(first: Doc<"todos">, second: Doc<"todos">) {
  if (first.isCompleted !== second.isCompleted) {
    return Number(first.isCompleted) - Number(second.isCompleted);
  }

  if (first.order !== undefined && second.order !== undefined) {
    return first.order - second.order;
  }

  if (first.order !== undefined) {
    return -1;
  }

  if (second.order !== undefined) {
    return 1;
  }

  return second._creationTime - first._creationTime;
}
