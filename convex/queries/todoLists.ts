import { v } from "convex/values";

import { query } from "../_generated/server";
import { requireAppUserId, requireListAccess } from "../shared/auth";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAppUserId(ctx);
    const memberships = await ctx.db
      .query("todoListUsers")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .collect();
    const lists = await Promise.all(
      memberships.map((membership) => ctx.db.get(membership.listId)),
    );
    const accessibleLists = lists.filter(
      (list): list is NonNullable<typeof list> => list !== null,
    );
    return accessibleLists.sort(compareTodoLists);
  },
});

export const members = query({
  args: {
    listId: v.id("todoLists"),
  },
  handler: async (ctx, args) => {
    const userId = await requireAppUserId(ctx);
    await requireListAccess(ctx, args.listId, userId);

    const memberships = await ctx.db
      .query("todoListUsers")
      .withIndex("by_list_id", (q) => q.eq("listId", args.listId))
      .collect();
    const memberUsers = await Promise.all(
      memberships.map((membership) => {
        const prefix = "better-auth:";
        if (membership.userId.startsWith(prefix)) {
          return ctx.db
            .query("users")
            .withIndex("by_better_auth_id", (q) =>
              q.eq("betterAuthId", membership.userId.slice(prefix.length)),
            )
            .unique();
        }
        return ctx.db
          .query("users")
          .withIndex("by_clerk_id", (q) => q.eq("clerkId", membership.userId))
          .unique();
      }),
    );

    return memberships
      .map((membership, index) => ({
        userId: membership.userId,
        firstName: memberUsers[index]?.firstName,
        lastName: memberUsers[index]?.lastName,
      }))
      .sort(compareMembers);
  },
});

function compareTodoLists(
  firstList: {
    _creationTime: number;
    order?: number;
    updatedAt: number;
  },
  secondList: {
    _creationTime: number;
    order?: number;
    updatedAt: number;
  },
) {
  if (firstList.order !== undefined && secondList.order !== undefined) {
    return firstList.order - secondList.order;
  }

  if (firstList.order !== undefined) {
    return -1;
  }

  if (secondList.order !== undefined) {
    return 1;
  }

  if (firstList.updatedAt !== secondList.updatedAt) {
    return secondList.updatedAt - firstList.updatedAt;
  }

  return secondList._creationTime - firstList._creationTime;
}

function compareMembers(
  firstMember: {
    userId: string;
    firstName?: string;
    lastName?: string;
  },
  secondMember: {
    userId: string;
    firstName?: string;
    lastName?: string;
  },
) {
  const firstName = getMemberSortValue(firstMember);
  const secondName = getMemberSortValue(secondMember);

  if (firstName !== secondName) {
    return firstName.localeCompare(secondName);
  }

  return firstMember.userId.localeCompare(secondMember.userId);
}

function getMemberSortValue(member: { firstName?: string; lastName?: string }) {
  return `${member.firstName ?? ""} ${member.lastName ?? ""}`
    .trim()
    .toLowerCase();
}
