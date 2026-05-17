import { v } from "convex/values";

import { query } from "../_generated/server";
import { requireClerkUserId } from "../shared/auth";

export const list = query({
  args: {
    listId: v.id("todoLists"),
  },
  handler: async (ctx, args) => {
    const userId = await requireClerkUserId(ctx);
    const todoList = await ctx.db.get(args.listId);

    if (!todoList || todoList.userId !== userId) {
      throw new Error("Todo list was not found.");
    }

    const todos = await ctx.db
      .query("todos")
      .withIndex("by_list_id", (q) => q.eq("listId", args.listId))
      .collect();

    return todos.sort((firstTodo, secondTodo) => {
      if (firstTodo.isCompleted !== secondTodo.isCompleted) {
        return Number(firstTodo.isCompleted) - Number(secondTodo.isCompleted);
      }

      return secondTodo._creationTime - firstTodo._creationTime;
    });
  },
});
