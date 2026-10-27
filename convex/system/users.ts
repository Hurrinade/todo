import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
} from "../_generated/server";
import { authComponent } from "../auth";
import { resolveAppUserId } from "../shared/auth";

// MCP keys are verified before this internal lookup. Deleted users cannot use keys.
export const resolveMcpOwner = internalQuery({
  args: { betterAuthId: v.string() },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, { betterAuthId }) => {
    const user = await authComponent.getAnyUserById(ctx, betterAuthId);
    return user ? resolveAppUserId(ctx, user._id) : null;
  },
});

// Profile sync never claims a legacy user by email. See docs/better-auth-migration.md.
export async function syncBetterAuthUser(
  ctx: MutationCtx,
  authUser: { _id: string; email: string; name: string; image?: string | null },
) {
  const user = await ctx.db
    .query("users")
    .withIndex("by_better_auth_id", (q) => q.eq("betterAuthId", authUser._id))
    .unique();
  const [firstName, ...lastName] = authUser.name.trim().split(/\s+/);
  const profile = {
    betterAuthId: authUser._id,
    email: authUser.email,
    // OTP signup can have no name. Keep a linked legacy profile's name in that case.
    ...(firstName
      ? { firstName, lastName: lastName.join(" ") || undefined }
      : {}),
    imageUrl: authUser.image ?? undefined,
    updatedAt: Date.now(),
  };

  if (user) {
    await ctx.db.patch(user._id, profile);
  } else {
    await ctx.db.insert("users", profile);
  }
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

    // Once linked, Better Auth owns the profile. Delayed Clerk webhooks must not
    // overwrite edits made in the new account settings.
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
