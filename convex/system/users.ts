import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
} from "../_generated/server";
import {
  CONVEX_OWNER_PREFIX,
  profileOwnerId,
  resolveLegacyOwner,
} from "../shared/auth";
import type { LegacyUser } from "../betterAuth/accounts";

// MCP keys are verified before this internal lookup. Deleted users cannot use keys.
export const resolveMcpOwner = internalQuery({
  args: { referenceId: v.string() },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, { referenceId }) => {
    if (!referenceId.startsWith(CONVEX_OWNER_PREFIX))
      return resolveLegacyOwner(ctx, referenceId);
    const id = ctx.db.normalizeId(
      "users",
      referenceId.slice(CONVEX_OWNER_PREFIX.length),
    );
    const profile = id && (await ctx.db.get("users", id));
    return profile && profileOwnerId(profile) === referenceId
      ? referenceId
      : null;
  },
});

export function profileNameFields(name: string) {
  const [firstName, ...lastName] = name.trim().split(/\s+/);
  return {
    firstName: firstName || undefined,
    lastName: lastName.join(" ") || undefined,
  };
}

// A historical auth owner may predate the app profile trigger.
export function insertLegacyProfile(ctx: MutationCtx, user: LegacyUser) {
  return ctx.db.insert("users", {
    betterAuthId: user.id,
    email: user.email,
    ...profileNameFields(user.name),
    imageUrl: user.image,
    updatedAt: Date.now(),
  });
}

export const syncFromClerk = internalMutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  returns: v.id("users"),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    const now = Date.now();

    if (!user) {
      return await ctx.db.insert("users", {
        clerkId: args.clerkId,
        email: args.email,
        imageUrl: args.imageUrl,
        firstName: args.firstName,
        lastName: args.lastName,
        updatedAt: now,
      });
    }

    // Delayed Clerk webhooks must not overwrite edits made in RiTodo.
    if (user.betterAuthId) return user._id;

    await ctx.db.patch(user._id, {
      email: args.email,
      imageUrl: args.imageUrl,
      firstName: args.firstName,
      lastName: args.lastName,
      updatedAt: now,
    });

    return user._id;
  },
});
