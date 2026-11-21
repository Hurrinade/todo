import { setupConvexAuth } from "@convex-dev/auth/server";
import {
  setupGoogle,
  vGoogleProfile,
} from "@convex-dev/auth/methods/google/server";
import { ConvexError, v } from "convex/values";
import { components, internal } from "./_generated/api";
import { internalMutation, query, type MutationCtx } from "./_generated/server";
import { authComponent } from "./auth";
import { getNativeProfile } from "./shared/auth";
import { LEGACY_GOOGLE_REQUIRED } from "./shared/googleSignIn";

const sessionLifetime = 90 * 24 * 60 * 60;
const siteUrl = process.env.SITE_URL;
const googleEnabled = process.env.AUTH_V2_GOOGLE_ENABLED === "true";

const auth = setupConvexAuth({
  component: components.auth,
  accessTokenTtlSeconds: 60,
  sessionMaxLifetimeSeconds: sessionLifetime,
  refreshInactivityTimeoutSeconds: sessionLifetime,
});

export const { signOut, refreshSession } = auth;
export const isAuthenticated = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => (await getNativeProfile(ctx)) !== null,
});
export const isGoogleEnabled = query({
  args: {},
  returns: v.boolean(),
  handler: () => googleEnabled && !!siteUrl,
});
export const { startSignInWithGoogle, completeSignInWithGoogle } = setupGoogle(
  auth,
  {
    component: components.authGoogle,
    allowedRedirectOrigins: googleEnabled && siteUrl ? [siteUrl] : [],
  },
).attachUserCallbacks({
  createUser: internal.nativeAuth.linkGoogle,
  onSignIn: internal.nativeAuth.checkGoogleLink,
});

const googleMethod = v.object({
  name: v.literal("google"),
  profile: vGoogleProfile,
});

async function findGoogleProfile(ctx: MutationCtx, subject: string) {
  if (!googleEnabled) {
    throw new ConvexError(LEGACY_GOOGLE_REQUIRED);
  }
  const betterAuthId = await ctx.runQuery(
    components.betterAuth.transition.googleOwner,
    { subject },
  );
  if (betterAuthId === null) return null;
  const owner = await authComponent.getAnyUserById(ctx, betterAuthId);
  if (!owner)
    throw new Error("The linked Better Auth account no longer exists.");

  const profile = await ctx.db
    .query("users")
    .withIndex("by_better_auth_id", (q) => q.eq("betterAuthId", betterAuthId))
    .unique();
  if (!profile) throw new Error("The linked account has no RiTodo profile.");
  return profile;
}

// Convex Auth supplies Google's verified subject after OAuth ticket redemption.
export const linkGoogle = internalMutation({
  args: { method: googleMethod },
  returns: v.id("users"),
  handler: async (ctx, { method }) => {
    const profile = await findGoogleProfile(ctx, method.profile.id);
    if (!profile) throw new ConvexError(LEGACY_GOOGLE_REQUIRED);
    if (!profile.nativeGoogleLinked) {
      await ctx.db.patch("users", profile._id, { nativeGoogleLinked: true });
    }
    return profile._id;
  },
});

export const checkGoogleLink = internalMutation({
  args: { method: googleMethod, userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, { method, userId }) => {
    const profile = await findGoogleProfile(ctx, method.profile.id);
    if (!profile?.nativeGoogleLinked || profile._id !== userId) {
      throw new Error("The linked Google account has changed.");
    }
    return null;
  },
});
