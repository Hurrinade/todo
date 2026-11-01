import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import type { Doc } from "../_generated/dataModel";
import { query } from "../_generated/server";
import { requireAppUserId, requireListAccess } from "../shared/auth";

export const get = query({
  args: {
    todoId: v.id("todos"),
  },
  handler: async (ctx, args) => {
    const userId = await requireAppUserId(ctx);
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

// Open todos of a list, ascending by order. Sectioned lists group them by
// sectionId on the client.
export const listOpen = query({
  args: {
    listId: v.id("todoLists"),
  },
  handler: async (ctx, args) => {
    const userId = await requireAppUserId(ctx);
    await requireListAccess(ctx, args.listId, userId);

    const todos = await ctx.db
      .query("todos")
      .withIndex("by_list_id_completed_and_order", (q) =>
        q.eq("listId", args.listId).eq("isCompleted", false),
      )
      .collect();

    return todos.map(toTodoListItem);
  },
});

// Completed todos of a list, newest first, in cursor pages.
export const listCompleted = query({
  args: {
    listId: v.id("todoLists"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const userId = await requireAppUserId(ctx);
    await requireListAccess(ctx, args.listId, userId);

    const result = await ctx.db
      .query("todos")
      .withIndex("by_list_id_completed_and_completed_at", (q) =>
        q.eq("listId", args.listId).eq("isCompleted", true),
      )
      .order("desc")
      .paginate(args.paginationOpts);

    return {
      ...result,
      page: result.page.map(toTodoListItem),
    };
  },
});

function toTodoListItem(todo: Doc<"todos">) {
  return {
    _id: todo._id,
    _creationTime: todo._creationTime,
    listId: todo.listId,
    sectionId: todo.sectionId,
    title: todo.title,
    isCompleted: todo.isCompleted,
    completedAt: todo.completedAt,
    order: todo.order,
    updatedAt: todo.updatedAt,
  };
}
