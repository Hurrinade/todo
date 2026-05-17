import { v } from "convex/values";

import { mutation } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { requireClerkUserId } from "../shared/auth";
import { normalizeTodoTitle } from "../shared/todo";

// Check if user has access to the list
async function requireOwnedList(
  ctx: MutationCtx,
  listId: Id<"todoLists">,
  userId: string,
) {
  const todoList = await ctx.db
    .query("todoListUsers")
    .withIndex("by_list_id_and_user_id", (q) =>
      q.eq("listId", listId).eq("userId", userId),
    )
    .first();

  if (!todoList) {
    throw new Error("Todo list was not found.");
  }

  return todoList;
}

export const create = mutation({
  args: {
    listId: v.id("todoLists"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireClerkUserId(ctx);
    await requireOwnedList(ctx, args.listId, userId);

    const now = Date.now();
    const todos = await ctx.db
      .query("todos")
      .withIndex("by_list_id", (q) => q.eq("listId", args.listId))
      .collect();
    const orderedTodos = todos.filter((todo) => todo.order !== undefined);
    const nextOrder =
      orderedTodos.length > 0
        ? Math.min(...orderedTodos.map((todo) => todo.order!)) - 1
        : 0;
    const todoId = await ctx.db.insert("todos", {
      listId: args.listId,
      title: normalizeTodoTitle(args.title),
      isCompleted: false,
      order: nextOrder,
      updatedAt: now,
    });

    await ctx.db.patch(args.listId, {
      updatedAt: now,
    });

    return todoId;
  },
});

export const toggle = mutation({
  args: {
    todoId: v.id("todos"),
  },
  handler: async (ctx, args) => {
    const userId = await requireClerkUserId(ctx);
    const todo = await ctx.db.get(args.todoId);

    if (!todo) {
      throw new Error("Todo was not found.");
    }

    await requireOwnedList(ctx, todo.listId, userId);

    const now = Date.now();
    const nextIsCompleted = !todo.isCompleted;
    const nextOrder = await getNextOrderForTodoState(
      ctx,
      todo.listId,
      nextIsCompleted,
      todo._id,
    );

    await ctx.db.patch(args.todoId, {
      isCompleted: nextIsCompleted,
      completedAt: nextIsCompleted ? now : undefined,
      order: nextOrder,
      updatedAt: now,
    });
    await ctx.db.patch(todo.listId, {
      updatedAt: now,
    });
  },
});

export const rename = mutation({
  args: {
    todoId: v.id("todos"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireClerkUserId(ctx);
    const todo = await ctx.db.get(args.todoId);

    if (!todo) {
      throw new Error("Todo was not found.");
    }

    await requireOwnedList(ctx, todo.listId, userId);

    const now = Date.now();

    await ctx.db.patch(args.todoId, {
      title: normalizeTodoTitle(args.title),
      updatedAt: now,
    });
    await ctx.db.patch(todo.listId, {
      updatedAt: now,
    });
  },
});

export const remove = mutation({
  args: {
    todoId: v.id("todos"),
  },
  handler: async (ctx, args) => {
    const userId = await requireClerkUserId(ctx);
    const todo = await ctx.db.get(args.todoId);

    if (!todo) {
      throw new Error("Todo was not found.");
    }

    await requireOwnedList(ctx, todo.listId, userId);

    await ctx.db.delete(args.todoId);
    await ctx.db.patch(todo.listId, {
      updatedAt: Date.now(),
    });
  },
});

export const reorder = mutation({
  args: {
    listId: v.id("todoLists"),
    todoIds: v.array(v.id("todos")),
  },
  handler: async (ctx, args) => {
    const userId = await requireClerkUserId(ctx);
    await requireOwnedList(ctx, args.listId, userId);

    const todos = await ctx.db
      .query("todos")
      .withIndex("by_list_id", (q) => q.eq("listId", args.listId))
      .collect();

    if (todos.length !== args.todoIds.length) {
      throw new Error("Todo order is out of date.");
    }

    const todoIds = new Set(todos.map((todo) => todo._id));

    for (const todoId of args.todoIds) {
      if (!todoIds.has(todoId)) {
        throw new Error("Todo order contains an invalid item.");
      }
    }

    const now = Date.now();

    await Promise.all(
      args.todoIds.map((todoId, index) =>
        ctx.db.patch(todoId, {
          order: index,
          updatedAt: now,
        }),
      ),
    );
    await ctx.db.patch(args.listId, {
      updatedAt: now,
    });
  },
});

export const clearCompleted = mutation({
  args: {
    listId: v.id("todoLists"),
  },
  handler: async (ctx, args) => {
    const userId = await requireClerkUserId(ctx);
    await requireOwnedList(ctx, args.listId, userId);

    const completedTodos = await ctx.db
      .query("todos")
      .withIndex("by_list_id_and_completed", (q) =>
        q.eq("listId", args.listId).eq("isCompleted", true),
      )
      .collect();

    if (completedTodos.length === 0) {
      return;
    }

    await Promise.all(completedTodos.map((todo) => ctx.db.delete(todo._id)));
    await ctx.db.patch(args.listId, {
      updatedAt: Date.now(),
    });
  },
});

export const uncheckCompleted = mutation({
  args: {
    listId: v.id("todoLists"),
  },
  handler: async (ctx, args) => {
    const userId = await requireClerkUserId(ctx);
    await requireOwnedList(ctx, args.listId, userId);

    const [openTodos, completedTodos] = await Promise.all([
      ctx.db
        .query("todos")
        .withIndex("by_list_id_and_completed", (q) =>
          q.eq("listId", args.listId).eq("isCompleted", false),
        )
        .collect(),
      ctx.db
        .query("todos")
        .withIndex("by_list_id_and_completed", (q) =>
          q.eq("listId", args.listId).eq("isCompleted", true),
        )
        .collect(),
    ]);

    if (completedTodos.length === 0) {
      return;
    }

    const nextOpenOrderStart = getMaxTodoOrder(openTodos) + 1;
    const sortedCompletedTodos = [...completedTodos].sort(compareTodosByOrder);
    const now = Date.now();

    await Promise.all(
      sortedCompletedTodos.map((todo, index) =>
        ctx.db.patch(todo._id, {
          isCompleted: false,
          completedAt: undefined,
          order: nextOpenOrderStart + index,
          updatedAt: now,
        }),
      ),
    );
    await ctx.db.patch(args.listId, {
      updatedAt: now,
    });
  },
});

async function getNextOrderForTodoState(
  ctx: MutationCtx,
  listId: Id<"todoLists">,
  isCompleted: boolean,
  excludedTodoId: Id<"todos">,
) {
  const todos = await ctx.db
    .query("todos")
    .withIndex("by_list_id_and_completed", (q) =>
      q.eq("listId", listId).eq("isCompleted", isCompleted),
    )
    .collect();
  const siblingTodos = todos.filter((todo) => todo._id !== excludedTodoId);

  return getMaxTodoOrder(siblingTodos) + 1;
}

function getMaxTodoOrder(
  todos: Array<{
    _creationTime: number;
    order?: number;
  }>,
) {
  if (todos.length === 0) {
    return -1;
  }

  const sortedTodos = [...todos].sort(compareTodosByOrder);
  return sortedTodos.reduce((maxOrder, todo, index) => {
    return Math.max(maxOrder, todo.order ?? index);
  }, -1);
}

function compareTodosByOrder(
  firstTodo: {
    _creationTime: number;
    order?: number;
  },
  secondTodo: {
    _creationTime: number;
    order?: number;
  },
) {
  if (firstTodo.order !== undefined && secondTodo.order !== undefined) {
    return firstTodo.order - secondTodo.order;
  }

  if (firstTodo.order !== undefined) {
    return -1;
  }

  if (secondTodo.order !== undefined) {
    return 1;
  }

  return secondTodo._creationTime - firstTodo._creationTime;
}
