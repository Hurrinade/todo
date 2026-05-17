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

    return todos.sort(compareTodos);
  },
});

function compareTodos(
  firstTodo: {
    _creationTime: number;
    isCompleted: boolean;
    order?: number;
  },
  secondTodo: {
    _creationTime: number;
    isCompleted: boolean;
    order?: number;
  },
) {
  if (firstTodo.order !== undefined && secondTodo.order !== undefined) {
    return firstTodo.order - secondTodo.order;
  }

  if (firstTodo.order !== undefined) {
    return -1;
  }

  if (secondTodo.order !== undefined) {
    return 1;
  }

  if (firstTodo.isCompleted !== secondTodo.isCompleted) {
    return Number(firstTodo.isCompleted) - Number(secondTodo.isCompleted);
  }

  return secondTodo._creationTime - firstTodo._creationTime;
}
