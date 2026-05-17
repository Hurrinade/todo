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

    const listId = await ctx.db.insert("todoLists", {
      title: normalizeTodoTitle(args.title),
      userId,
      updatedAt: Date.now(),
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
