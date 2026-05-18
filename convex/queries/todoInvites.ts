import { v } from "convex/values";

import { query } from "../_generated/server";
import { getClerkUserId } from "../shared/auth";

export const getByToken = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const invite = await ctx.db
      .query("todoListInvites")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (!invite) {
      return null;
    }

    const list = await ctx.db.get(invite.listId);

    if (!list) {
      return null;
    }

    const currentUserId = await getClerkUserId(ctx);
    const existingMembership = currentUserId
      ? await ctx.db
          .query("todoListUsers")
          .withIndex("by_list_id_and_user_id", (q) =>
            q.eq("listId", list._id).eq("userId", currentUserId),
          )
          .unique()
      : null;

    return {
      listId: list._id,
      listTitle: list.title,
      token: invite.token,
      expiresAt: invite.expiresAt,
      createdByUserId: invite.createdByUserId,
      isCurrentUserMember: Boolean(existingMembership),
    };
  },
});
