import { v } from "convex/values";

import { requireClerkUserId } from "../shared/auth";
import { normalizeTodoTitle } from "../shared/todo";
import { mutation } from "../triggers/todolistFunctions";

export const create = mutation({
  args: {
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireClerkUserId(ctx);
    const existingLists = await ctx.db
      .query("todoLists")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .collect();
    const nextOrder = existingLists.length > 0 ? existingLists.length - 1 : 0;
    const now = Date.now();

    const listId = await ctx.db.insert("todoLists", {
      title: normalizeTodoTitle(args.title),
      userId,
      order: nextOrder,
      updatedAt: now,
    });

    return listId;
  },
});

export const remove = mutation({
  args: {
    listId: v.id("todoLists"),
  },
  handler: async (ctx, args) => {
    const userId = await requireClerkUserId(ctx);
    const todoList = await ctx.db.get(args.listId);

    if (!todoList || todoList.userId !== userId) {
      throw new Error("Todo list was not found.");
    }

    await ctx.db.delete(args.listId);
  },
});

export const rename = mutation({
  args: {
    listId: v.id("todoLists"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireClerkUserId(ctx);
    const todoList = await ctx.db.get(args.listId);

    if (!todoList || todoList.userId !== userId) {
      throw new Error("Todo list was not found.");
    }

    await ctx.db.patch(args.listId, {
      title: normalizeTodoTitle(args.title),
      updatedAt: Date.now(),
    });
  },
});

export const reorder = mutation({
  args: {
    listIds: v.array(v.id("todoLists")),
  },
  handler: async (ctx, args) => {
    const userId = await requireClerkUserId(ctx);
    const todoLists = await ctx.db
      .query("todoLists")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .collect();

    if (todoLists.length !== args.listIds.length) {
      throw new Error("Todo list order is out of date.");
    }

    const todoListIds = new Set(todoLists.map((todoList) => todoList._id));

    for (const listId of args.listIds) {
      if (!todoListIds.has(listId)) {
        throw new Error("Todo list order contains an invalid item.");
      }
    }

    const now = Date.now();

    await Promise.all(
      args.listIds.map((listId, index) =>
        ctx.db.patch(listId, {
          order: index,
          updatedAt: now,
        }),
      ),
    );
  },
});
