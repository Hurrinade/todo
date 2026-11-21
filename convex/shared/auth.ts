import { convexAuthProvider, getAuthUserId } from "@convex-dev/auth/server";
import { authComponent } from "../auth";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { appError, notFoundError } from "./errors";

type AuthContext = QueryCtx | MutationCtx;

function isNativeIssuer(issuer: string) {
  if (!process.env.CONVEX_CLOUD_URL) return false;
  const provider = convexAuthProvider();
  return "issuer" in provider && issuer === provider.issuer;
}

export async function getNativeProfile(ctx: AuthContext) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity || !isNativeIssuer(identity.issuer)) return null;
  const userId = await getAuthUserId(ctx);
  const profile = userId && (await ctx.db.get("users", userId));
  if (!profile?.nativeGoogleLinked || !profile.betterAuthId) return null;

  const owner = await authComponent.getAnyUserById(ctx, profile.betterAuthId);
  return owner ? { ...profile, betterAuthId: profile.betterAuthId } : null;
}

// Keep persisted Clerk IDs for linked users. New identities cannot collide with them.
export async function getAppUserId(ctx: AuthContext) {
  const identity = await ctx.auth.getUserIdentity();
  if (identity && isNativeIssuer(identity.issuer)) {
    const profile = await getNativeProfile(ctx);
    return profile
      ? (profile.clerkId ?? `better-auth:${profile.betterAuthId}`)
      : null;
  }
  const authUser = await authComponent.safeGetAuthUser(ctx);
  if (!authUser) {
    return null;
  }

  return resolveAppUserId(ctx, authUser._id);
}

// Caller must first verify the session or API key and that its auth user exists.
export async function resolveAppUserId(ctx: AuthContext, betterAuthId: string) {
  const user = await ctx.db
    .query("users")
    .withIndex("by_better_auth_id", (q) => q.eq("betterAuthId", betterAuthId))
    .unique();

  return user?.clerkId ?? `better-auth:${betterAuthId}`;
}

export async function requireAppUserId(ctx: AuthContext) {
  const userId = await getAppUserId(ctx);
  if (!userId) {
    throw appError("unauthenticated", "You must be signed in.", "signedOut");
  }
  return userId;
}

export async function requireListAccess(
  ctx: AuthContext,
  listId: Id<"todoLists">,
  userId?: string,
) {
  const appUserId = userId ?? (await requireAppUserId(ctx));
  const membership = await ctx.db
    .query("todoListUsers")
    .withIndex("by_list_id_and_user_id", (q) =>
      q.eq("listId", listId).eq("userId", appUserId),
    )
    .unique();

  if (!membership) {
    throw notFoundError("todoLists");
  }

  return membership;
}

// User must be owner
export async function requireOwnerListAccess(
  ctx: AuthContext,
  listId: Id<"todoLists">,
  userId?: string,
) {
  const appUserId = userId ?? (await requireAppUserId(ctx));
  const list = await ctx.db.get(listId);

  if (!list || list.userId !== appUserId) {
    throw appError(
      "forbidden",
      "Only the list owner can do this.",
      "ownerOnly",
    );
  }

  return list;
}
