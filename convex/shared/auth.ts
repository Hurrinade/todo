import { authComponent } from "../auth";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type AuthContext = QueryCtx | MutationCtx;

// Keep persisted Clerk IDs for linked users. New identities cannot collide with them.
export async function getAppUserId(ctx: AuthContext) {
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
    throw new Error("You must be signed in.");
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
    throw new Error("Todo list was not found.");
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
    throw new Error("User does not have access to this list as owner.");
  }

  return list;
}
