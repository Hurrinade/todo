import { getAuthUserId } from "@convex-dev/auth/server";
import { components } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { appError, notFoundError } from "./errors";

type AuthContext = QueryCtx | MutationCtx;

export async function getProfile(ctx: AuthContext) {
  const userId = await getAuthUserId<"authIdentities">(ctx);
  const id = userId && ctx.db.normalizeId("authIdentities", userId);
  const identity = id && (await ctx.db.get("authIdentities", id));
  return identity?.profileId ? ctx.db.get("users", identity.profileId) : null;
}

export async function requireProfile(ctx: AuthContext) {
  const profile = await getProfile(ctx);
  if (!profile) {
    throw appError("unauthenticated", "You must be signed in.", "signedOut");
  }
  return profile;
}

export const CONVEX_OWNER_PREFIX = "convex-auth:";
const LEGACY_OWNER_PREFIX = "better-auth:";

export function profileOwnerId(profile: Doc<"users">) {
  return (
    profile.clerkId ??
    (profile.betterAuthId
      ? `${LEGACY_OWNER_PREFIX}${profile.betterAuthId}`
      : `${CONVEX_OWNER_PREFIX}${profile._id}`)
  );
}

// Reactive reads can return an empty result if the session ends before their
// subscriptions are removed. Writes should use requireAppUserId instead.
export async function getAppUserId(ctx: AuthContext) {
  const profile = await getProfile(ctx);
  return profile ? profileOwnerId(profile) : null;
}

export async function requireAppUserId(ctx: AuthContext) {
  return profileOwnerId(await requireProfile(ctx));
}

export function findLegacyProfile(ctx: AuthContext, id: string) {
  return ctx.db
    .query("users")
    .withIndex("by_better_auth_id", (q) => q.eq("betterAuthId", id))
    .unique();
}

// An MCP key may belong to a historical owner with no app profile yet.
export async function resolveLegacyOwner(ctx: AuthContext, id: string) {
  const user = await ctx.runQuery(components.betterAuth.accounts.byId, { id });
  if (!user) return null;
  const profile = await findLegacyProfile(ctx, id);
  return profile ? profileOwnerId(profile) : `${LEGACY_OWNER_PREFIX}${id}`;
}

export function getProfileByOwnerId(ctx: AuthContext, ownerId: string) {
  if (ownerId.startsWith(CONVEX_OWNER_PREFIX)) {
    const id = ctx.db.normalizeId(
      "users",
      ownerId.slice(CONVEX_OWNER_PREFIX.length),
    );
    return id ? ctx.db.get("users", id) : Promise.resolve(null);
  }
  if (ownerId.startsWith(LEGACY_OWNER_PREFIX)) {
    return findLegacyProfile(ctx, ownerId.slice(LEGACY_OWNER_PREFIX.length));
  }
  return ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", ownerId))
    .unique();
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
