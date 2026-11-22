import { setupConvexAuth } from "@convex-dev/auth/server";
import { setupEmailMagicLink } from "@convex-dev/auth/methods/email-magic-link/server";
import {
  setupGoogle,
  vGoogleProfile,
} from "@convex-dev/auth/methods/google/server";
import { ConvexError, v } from "convex/values";
import { components, internal } from "./_generated/api";
import {
  env,
  internalMutation,
  query,
  type MutationCtx,
} from "./_generated/server";
import { getProfile, findLegacyProfile } from "./shared/auth";
import { USE_EMAIL_LINK } from "./shared/googleSignIn";
import { insertLegacyProfile, profileNameFields } from "./system/users";
import type { LegacyUser } from "./betterAuth/accounts";

const sessionLifetime = 90 * 24 * 60 * 60;

const auth = setupConvexAuth({
  component: components.auth,
  usersTable: "authIdentities",
  accessTokenTtlSeconds: 60,
  sessionMaxLifetimeSeconds: sessionLifetime,
  refreshInactivityTimeoutSeconds: sessionLifetime,
});

export const { signOut, refreshSession } = auth;
export const isAuthenticated = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => (await getProfile(ctx)) !== null,
});
export const { startSignInWithGoogle, completeSignInWithGoogle } = setupGoogle(
  auth,
  {
    component: components.authGoogle,
    allowedRedirectOrigins: [env.SITE_URL],
  },
).attachUserCallbacks({ createUser: internal.nativeAuth.createGoogleIdentity });

export const { sendEmailMagicLink, signInWithEmailMagicLink } =
  setupEmailMagicLink(auth, {
    component: components.authEmail,
    emailSender: {
      kind: "resend",
      sendEmail: components.resend.lib.sendEmail,
      apiKey: env.RESEND_API_KEY,
      from: env.AUTH_EMAIL_FROM,
    },
    url: new URL("/sign-in-with-link", env.SITE_URL).href,
  }).attachUserCallbacks({
    createUser: internal.nativeAuth.createEmailIdentity,
    onSignIn: internal.nativeAuth.linkVerifiedEmail,
  });

const emailMethod = v.object({
  name: v.literal("emailMagicLink"),
  profile: v.object({}),
});

export const createEmailIdentity = internalMutation({
  args: { method: emailMethod },
  returns: v.id("authIdentities"),
  handler: (ctx) => ctx.db.insert("authIdentities", {}),
});

async function lookupVerifiedEmail(ctx: MutationCtx, email: string) {
  const normalized = email.normalize("NFC");
  const binding = await ctx.db
    .query("verifiedLoginEmails")
    .withIndex("by_email", (q) => q.eq("email", normalized))
    .unique();
  const legacy = await ctx.runQuery(
    components.betterAuth.accounts.byVerifiedEmail,
    { email },
  );
  return { binding, legacy, normalized };
}

async function legacyProfileId(ctx: MutationCtx, user: LegacyUser) {
  const profile = await findLegacyProfile(ctx, user.id);
  return profile?._id ?? insertLegacyProfile(ctx, user);
}

export const linkVerifiedEmail = internalMutation({
  args: { method: emailMethod, userId: v.id("authIdentities") },
  returns: v.null(),
  handler: async (ctx, { userId }) => {
    const identity = await ctx.db.get("authIdentities", userId);
    if (!identity) throw new Error("Email sign-in has no identity.");
    if (identity.profileId) return null;

    // Only Convex Auth can record this address, after consuming a browser-bound link.
    const verified = await ctx.runQuery(
      components.authEmail.verifiedEmails.getPrimaryEmail,
      { userId },
    );
    if (!verified)
      throw new Error("Email sign-in requires a verified address.");
    const email = verified.toLowerCase();
    const { binding, legacy, normalized } = await lookupVerifiedEmail(
      ctx,
      email,
    );
    const legacyId = legacy && (await legacyProfileId(ctx, legacy));
    if (binding && legacyId && binding.profileId !== legacyId) {
      throw new Error("Conflicting verified accounts require review.");
    }
    const profileId =
      binding?.profileId ??
      legacyId ??
      (await ctx.db.insert("users", {
        email: verified,
        updatedAt: Date.now(),
      }));
    if (!binding)
      await ctx.db.insert("verifiedLoginEmails", {
        email: normalized,
        profileId,
      });
    await ctx.db.patch("authIdentities", userId, { profileId });
    return null;
  },
});

export const createGoogleIdentity = internalMutation({
  args: {
    method: v.object({ name: v.literal("google"), profile: vGoogleProfile }),
  },
  returns: v.id("authIdentities"),
  handler: async (ctx, { method: { profile } }) => {
    const legacy = await ctx.runQuery(
      components.betterAuth.accounts.byGoogleSubject,
      { subject: profile.id },
    );
    if (legacy) {
      const profileId = await legacyProfileId(ctx, legacy);
      return ctx.db.insert("authIdentities", { profileId });
    }

    if (!profile.email) throw new ConvexError(USE_EMAIL_LINK);
    const email = profile.email.toLowerCase();
    const domain = email.split("@").at(-1);
    // Google is authoritative for Gmail and a matching Workspace domain.
    const authoritative =
      profile.emailVerified &&
      (domain === "gmail.com" ||
        (!!profile.hostedDomain &&
          domain === profile.hostedDomain.toLowerCase()));
    const existing = await lookupVerifiedEmail(ctx, email);
    if (existing.binding && authoritative) {
      return ctx.db.insert("authIdentities", {
        profileId: existing.binding.profileId,
      });
    }
    if (existing.binding || existing.legacy)
      throw new ConvexError(USE_EMAIL_LINK);

    const profileId = await ctx.db.insert("users", {
      email,
      ...profileNameFields(profile.name ?? ""),
      imageUrl: profile.picture,
      updatedAt: Date.now(),
    });
    if (authoritative)
      await ctx.db.insert("verifiedLoginEmails", {
        email: existing.normalized,
        profileId,
      });
    return ctx.db.insert("authIdentities", { profileId });
  },
});
