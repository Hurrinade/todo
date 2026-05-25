import { v } from "convex/values";

import {
  requireClerkUserId,
  requireListAccess,
  requireOwnerListAccess,
} from "../shared/auth";
import {
  DEFAULT_TODO_SECTION_TITLE,
  normalizeTodoListEmoji,
  normalizeSectionTitle,
  normalizeTodoTitle,
} from "../shared/todo";
import { mutation } from "../triggers/todolistFunctions";

export const create = mutation({
  args: {
    title: v.string(),
    emoji: v.optional(v.string()),
    kind: v.union(v.literal("regular"), v.literal("sectioned")),
  },
  handler: async (ctx, args) => {
    const userId = await requireClerkUserId(ctx);
    const existingLists = await ctx.db
      .query("todoLists")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .collect();
    const nextOrder = existingLists.length > 0 ? existingLists.length - 1 : 0;
    const now = Date.now();
    const emoji = normalizeTodoListEmoji(args.emoji ?? "");

    const listId = await ctx.db.insert("todoLists", {
      title: normalizeTodoTitle(args.title),
      emoji: emoji || undefined,
      kind: args.kind,
      userId,
      order: nextOrder,
      updatedAt: now,
    });

    if (args.kind === "sectioned") {
      await ctx.db.insert("todoSections", {
        listId,
        title: normalizeSectionTitle(DEFAULT_TODO_SECTION_TITLE),
        order: 0,
        isDefault: true,
        updatedAt: now,
      });
    }

    return listId;
  },
});

export const remove = mutation({
  args: {
    listId: v.id("todoLists"),
  },
  handler: async (ctx, args) => {
    const userId = await requireClerkUserId(ctx);
    await requireOwnerListAccess(ctx, args.listId, userId);

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
    await requireListAccess(ctx, args.listId, userId);

    await ctx.db.patch(args.listId, {
      title: normalizeTodoTitle(args.title),
      updatedAt: Date.now(),
    });
  },
});

export const updateEmoji = mutation({
  args: {
    listId: v.id("todoLists"),
    emoji: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireClerkUserId(ctx);
    await requireListAccess(ctx, args.listId, userId);

    const emoji = normalizeTodoListEmoji(args.emoji);

    await ctx.db.patch(args.listId, {
      emoji: emoji || undefined,
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
    const todoListUsers = await ctx.db
      .query("todoListUsers")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .collect();

    if (todoListUsers.length !== args.listIds.length) {
      throw new Error("Todo list order is out of date.");
    }

    const todoListIds = new Set(
      todoListUsers.map((todoListUser) => todoListUser.listId),
    );

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
