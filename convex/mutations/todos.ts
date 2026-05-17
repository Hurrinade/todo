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
    const todoId = await ctx.db.insert("todos", {
      listId: args.listId,
      title: normalizeTodoTitle(args.title),
      isCompleted: false,
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

    await ctx.db.patch(args.todoId, {
      isCompleted: nextIsCompleted,
      completedAt: nextIsCompleted ? now : undefined,
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
