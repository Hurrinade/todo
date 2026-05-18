import { internal } from "../_generated/api";
import { mutation, internalMutation } from "../_generated/server";
import { v } from "convex/values";

import { requireClerkUserId, requireOwnerListAccess } from "../shared/auth";

const INVITE_EXPIRATION_MS = 30 * 60 * 1000;

export const create = mutation({
  args: {
    listId: v.id("todoLists"),
  },
  handler: async (ctx, args) => {
    const userId = await requireClerkUserId(ctx);
    await requireOwnerListAccess(ctx, args.listId, userId);

    const existingInvites = await ctx.db
      .query("todoListInvites")
      .withIndex("by_list_id", (q) => q.eq("listId", args.listId))
      .collect();

    for (const invite of existingInvites) {
      await ctx.db.delete(invite._id);
    }

    const token = crypto.randomUUID();
    const expiresAt = Date.now() + INVITE_EXPIRATION_MS;
    const inviteId = await ctx.db.insert("todoListInvites", {
      listId: args.listId,
      token,
      createdByUserId: userId,
      expiresAt,
    });

    await ctx.scheduler.runAfter(
      INVITE_EXPIRATION_MS,
      internal.mutations.todoInvites.expire,
      {
        inviteId,
        token,
      },
    );

    return {
      inviteId,
      token,
      expiresAt,
      listId: args.listId,
    };
  },
});

export const accept = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireClerkUserId(ctx);
    const invite = await ctx.db
      .query("todoListInvites")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (!invite) {
      throw new Error("Invite link is not valid.");
    }

    if (invite.expiresAt <= Date.now()) {
      await ctx.db.delete(invite._id);
      throw new Error("Invite link has expired.");
    }

    const list = await ctx.db.get(invite.listId);

    if (!list) {
      await ctx.db.delete(invite._id);
      throw new Error("Todo list was not found.");
    }

    const existingMembership = await ctx.db
      .query("todoListUsers")
      .withIndex("by_list_id_and_user_id", (q) =>
        q.eq("listId", list._id).eq("userId", userId),
      )
      .unique();

    if (!existingMembership) {
      await ctx.db.insert("todoListUsers", {
        listId: list._id,
        userId,
      });
    }

    return {
      listId: list._id,
    };
  },
});

export const expire = internalMutation({
  args: {
    inviteId: v.id("todoListInvites"),
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const invite = await ctx.db.get(args.inviteId);

    if (!invite || invite.token !== args.token) {
      return;
    }

    if (invite.expiresAt > Date.now()) {
      return;
    }

    await ctx.db.delete(invite._id);
  },
});
