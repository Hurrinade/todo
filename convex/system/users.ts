import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

export const syncFromClerk = internalMutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
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
