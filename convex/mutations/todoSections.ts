import { v } from "convex/values";

import type { Id } from "../_generated/dataModel";
import {
  internalMutation,
  mutation,
  type MutationCtx,
} from "../_generated/server";
import { requireClerkUserId, requireListAccess } from "../shared/auth";
import { normalizeSectionTitle } from "../shared/todo";

export const create = mutation({
  args: {
    listId: v.id("todoLists"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireClerkUserId(ctx);

    return createTodoSection(ctx, userId, args.listId, args.title);
  },
});

export const createForUser = internalMutation({
  args: {
    userId: v.string(),
    listId: v.id("todoLists"),
    title: v.string(),
  },
  handler: (ctx, args) =>
    createTodoSection(ctx, args.userId, args.listId, args.title),
});

export const rename = mutation({
  args: {
    sectionId: v.id("todoSections"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireClerkUserId(ctx);

    await renameTodoSection(ctx, userId, args.sectionId, args.title);
  },
});

export const renameForUser = internalMutation({
  args: {
    userId: v.string(),
    sectionId: v.id("todoSections"),
    title: v.string(),
  },
  handler: (ctx, args) =>
    renameTodoSection(ctx, args.userId, args.sectionId, args.title),
});

export const reorder = mutation({
  args: {
    listId: v.id("todoLists"),
    sectionIds: v.array(v.id("todoSections")),
  },
  handler: async (ctx, args) => {
    const userId = await requireClerkUserId(ctx);
    await requireListAccess(ctx, args.listId, userId);

    const sections = await ctx.db
      .query("todoSections")
      .withIndex("by_list_id", (q) => q.eq("listId", args.listId))
      .collect();

    if (sections.length !== args.sectionIds.length) {
      throw new Error("Section order is out of date.");
    }

    const sectionIds = new Set(sections.map((section) => section._id));

    for (const sectionId of args.sectionIds) {
      if (!sectionIds.has(sectionId)) {
        throw new Error("Section order contains an invalid item.");
      }
    }

    const now = Date.now();

    await Promise.all(
      args.sectionIds.map((sectionId, index) =>
        ctx.db.patch(sectionId, {
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

async function createTodoSection(
  ctx: MutationCtx,
  userId: string,
  listId: Id<"todoLists">,
  title: string,
) {
  await requireListAccess(ctx, listId, userId);

  const list = await ctx.db.get(listId);

  if (!list || list.kind !== "sectioned") {
    throw new Error("Sections are only available in sectioned lists.");
  }

  const sections = await ctx.db
    .query("todoSections")
    .withIndex("by_list_id", (q) => q.eq("listId", listId))
    .collect();

  const nextOrder =
    sections.length > 0
      ? Math.max(...sections.map((section) => section.order ?? 0)) + 1
      : 0;
  const now = Date.now();

  const sectionId = await ctx.db.insert("todoSections", {
    listId,
    title: normalizeSectionTitle(title),
    order: nextOrder,
    isDefault: false,
    updatedAt: now,
  });

  await ctx.db.patch(listId, { updatedAt: now });

  return sectionId;
}

async function renameTodoSection(
  ctx: MutationCtx,
  userId: string,
  sectionId: Id<"todoSections">,
  title: string,
) {
  const section = await ctx.db.get(sectionId);

  if (!section) {
    throw new Error("Section was not found.");
  }

  await requireListAccess(ctx, section.listId, userId);

  if (section.isDefault) {
    throw new Error("The default Other section cannot be renamed.");
  }

  const now = Date.now();

  await ctx.db.patch(sectionId, {
    title: normalizeSectionTitle(title),
    updatedAt: now,
  });
  await ctx.db.patch(section.listId, { updatedAt: now });
}
