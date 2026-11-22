import { v, type Infer } from "convex/values";
import { query, type QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

const legacyUser = v.object({
  id: v.string(),
  email: v.string(),
  emailVerified: v.boolean(),
  name: v.string(),
  image: v.optional(v.string()),
});
export type LegacyUser = Infer<typeof legacyUser>;

function profile(user: Doc<"user">): LegacyUser {
  return {
    id: user._id,
    email: user.email,
    emailVerified: user.emailVerified,
    name: user.name,
    image: user.image ?? undefined,
  };
}

async function findUser(ctx: QueryCtx, id: string) {
  const userId = ctx.db.normalizeId("user", id);
  return userId ? await ctx.db.get("user", userId) : null;
}

export const byId = query({
  args: { id: v.string() },
  returns: v.union(legacyUser, v.null()),
  handler: async (ctx, { id }) => {
    const user = await findUser(ctx, id);
    return user ? profile(user) : null;
  },
});

export const byGoogleSubject = query({
  args: { subject: v.string() },
  returns: v.union(legacyUser, v.null()),
  handler: async (ctx, { subject }) => {
    const account = await ctx.db
      .query("account")
      .withIndex("accountId_providerId", (q) =>
        q.eq("accountId", subject).eq("providerId", "google"),
      )
      .unique();
    if (!account) return null;
    const user = await findUser(ctx, account.userId);
    if (!user) throw new Error("The legacy Google account has no owner.");
    return profile(user);
  },
});

export const byVerifiedEmail = query({
  args: { email: v.string() },
  returns: v.union(legacyUser, v.null()),
  handler: async (ctx, { email }) => {
    const user = await ctx.db
      .query("user")
      .withIndex("email_name", (q) => q.eq("email", email))
      .unique();
    return user?.emailVerified ? profile(user) : null;
  },
});
