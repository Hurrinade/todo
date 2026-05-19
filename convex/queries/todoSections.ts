import { v } from "convex/values";

import { query } from "../_generated/server";
import { requireClerkUserId, requireListAccess } from "../shared/auth";

export const list = query({
  args: {
    listId: v.id("todoLists"),
  },
  handler: async (ctx, args) => {
    const userId = await requireClerkUserId(ctx);
    await requireListAccess(ctx, args.listId, userId);

    const sections = await ctx.db
      .query("todoSections")
      .withIndex("by_list_id", (q) => q.eq("listId", args.listId))
      .collect();

    return sections.sort(compareSections);
  },
});

function compareSections(
  firstSection: {
    _creationTime: number;
    order?: number;
  },
  secondSection: {
    _creationTime: number;
    order?: number;
  },
) {
  if (firstSection.order !== undefined && secondSection.order !== undefined) {
    return firstSection.order - secondSection.order;
  }

  if (firstSection.order !== undefined) {
    return -1;
  }

  if (secondSection.order !== undefined) {
    return 1;
  }

  return firstSection._creationTime - secondSection._creationTime;
}
