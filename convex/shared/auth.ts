import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type AuthContext = Pick<QueryCtx, "auth"> | Pick<MutationCtx, "auth">;
type ListAccessContext =
  | Pick<QueryCtx, "auth" | "db">
  | Pick<MutationCtx, "auth" | "db">;

export async function getClerkUserId(ctx: AuthContext) {
  const identity = await ctx.auth.getUserIdentity();

  return identity?.subject ?? null;
}

export async function requireClerkUserId(ctx: AuthContext) {
  const clerkUserId = await getClerkUserId(ctx);

  if (!clerkUserId) {
    throw new Error("You must be signed in.");
  }

  return clerkUserId;
}

export async function requireListAccess(
  ctx: ListAccessContext,
  listId: Id<"todoLists">,
  userId?: string,
) {
  const clerkUserId = userId ?? (await requireClerkUserId(ctx));
  const membership = await ctx.db
    .query("todoListUsers")
    .withIndex("by_list_id_and_user_id", (q) =>
      q.eq("listId", listId).eq("userId", clerkUserId),
    )
    .unique();

  if (!membership) {
    throw new Error("Todo list was not found.");
  }

  return membership;
}

// User must be owner
export async function requireOwnerListAccess(
  ctx: ListAccessContext,
  listId: Id<"todoLists">,
  userId?: string,
) {
  const clerkUserId = userId ?? (await requireClerkUserId(ctx));
  const userLists = await ctx.db
    .query("todoLists")
    .withIndex("by_user_id", (q) => q.eq("userId", clerkUserId))
    .collect();

  if (!userLists.length) {
    throw new Error("User has no active lists.");
  }

  if (!userLists.some((list) => list._id === listId)) {
    throw new Error("User does not have access to this list as owner.");
  }

  return userLists.find((list) => list._id === listId)!;
}
