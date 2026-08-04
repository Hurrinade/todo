import { v } from "convex/values";

import { query } from "../_generated/server";
import { requireClerkUserId, requireListAccess } from "../shared/auth";

export const get = query({
  args: {
    todoId: v.id("todos"),
  },
  handler: async (ctx, args) => {
    const userId = await requireClerkUserId(ctx);
    const todo = await ctx.db.get(args.todoId);

    if (!todo) {
      return null;
    }

    await requireListAccess(ctx, todo.listId, userId);
    const list = await ctx.db.get(todo.listId);

    if (!list) {
      return null;
    }

    return {
      todo,
      list: {
        _id: list._id,
        title: list.title,
        emoji: list.emoji,
      },
    };
  },
});

export const list = query({
  args: {
    listId: v.id("todoLists"),
  },
  handler: async (ctx, args) => {
    const userId = await requireClerkUserId(ctx);
    await requireListAccess(ctx, args.listId, userId);

    const todos = await ctx.db
      .query("todos")
      .withIndex("by_list_id", (q) => q.eq("listId", args.listId))
      .collect();

    return todos.sort(compareTodos).map((todo) => ({
      _id: todo._id,
      _creationTime: todo._creationTime,
      listId: todo.listId,
      sectionId: todo.sectionId,
      title: todo.title,
      isCompleted: todo.isCompleted,
      completedAt: todo.completedAt,
      order: todo.order,
      updatedAt: todo.updatedAt,
    }));
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
  if (firstTodo.isCompleted !== secondTodo.isCompleted) {
    return Number(firstTodo.isCompleted) - Number(secondTodo.isCompleted);
  }

  if (firstTodo.order !== undefined && secondTodo.order !== undefined) {
    return firstTodo.order - secondTodo.order;
  }

  if (firstTodo.order !== undefined) {
    return -1;
  }

  if (secondTodo.order !== undefined) {
    return 1;
  }

  return secondTodo._creationTime - firstTodo._creationTime;
}
