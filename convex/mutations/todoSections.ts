import { v } from "convex/values";

import { mutation } from "../_generated/server";
import { requireClerkUserId, requireListAccess } from "../shared/auth";
import { normalizeSectionTitle } from "../shared/todo";

export const create = mutation({
  args: {
    listId: v.id("todoLists"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireClerkUserId(ctx);
    await requireListAccess(ctx, args.listId, userId);

    const list = await ctx.db.get(args.listId);

    if (!list || list.kind !== "sectioned") {
      throw new Error("Sections are only available in sectioned lists.");
    }

    const sections = await ctx.db
      .query("todoSections")
      .withIndex("by_list_id", (q) => q.eq("listId", args.listId))
      .collect();

    const nextOrder =
      sections.length > 0
        ? Math.max(...sections.map((section) => section.order ?? 0)) + 1
        : 0;
    const now = Date.now();

    const sectionId = await ctx.db.insert("todoSections", {
      listId: args.listId,
      title: normalizeSectionTitle(args.title),
      order: nextOrder,
      isDefault: false,
      updatedAt: now,
    });

    await ctx.db.patch(args.listId, {
      updatedAt: now,
    });

    return sectionId;
  },
});

export const rename = mutation({
  args: {
    sectionId: v.id("todoSections"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireClerkUserId(ctx);
    const section = await ctx.db.get(args.sectionId);

    if (!section) {
      throw new Error("Section was not found.");
    }

    await requireListAccess(ctx, section.listId, userId);

    if (section.isDefault) {
      throw new Error("The default Other section cannot be renamed.");
    }

    const now = Date.now();

    await ctx.db.patch(args.sectionId, {
      title: normalizeSectionTitle(args.title),
      updatedAt: now,
    });
    await ctx.db.patch(section.listId, {
      updatedAt: now,
    });
  },
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
