import { v, type Infer } from "convex/values";

import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../_generated/server";
import { updateTodoListStats } from "../shared/todoListStats";
import { getLastOrder, ORDER_STEP } from "../shared/todoOrder";

// Bulk todo work runs in batches so lists of any size stay under Convex's
// per-mutation limits. A full batch schedules the next one until none are left.
export const TODO_BATCH_SIZE = 200;
export const COMPLETED_TODO_RETENTION_MS = 14 * 24 * 60 * 60 * 1000;

const completedTodosArgs = v.object({
  listId: v.id("todoLists"),
  action: v.union(v.literal("clear"), v.literal("uncheck")),
  completedBefore: v.number(),
});

type BatchCtx = Pick<MutationCtx, "db" | "scheduler">;

/**
 * Deletes ("clear") or reopens ("uncheck") a list's completed todos, oldest
 * completion first. Only todos completed at or before `completedBefore` are
 * touched, so a todo checked while a big list is still processing survives.
 */
export async function processCompletedTodos(
  ctx: BatchCtx,
  args: Infer<typeof completedTodosArgs>,
) {
  const list = await ctx.db.get(args.listId);

  if (!list) {
    return;
  }

  const todos = await ctx.db
    .query("todos")
    .withIndex("by_list_id_completed_and_completed_at", (q) =>
      q
        .eq("listId", args.listId)
        .eq("isCompleted", true)
        .lte("completedAt", args.completedBefore),
    )
    .take(TODO_BATCH_SIZE);

  if (todos.length === 0) {
    return;
  }

  const now = Date.now();

  if (args.action === "clear") {
    await Promise.all(todos.map((todo) => ctx.db.delete(todo._id)));
  } else {
    await reopenTodos(ctx, todos, now);
  }

  await updateTodoListStats(ctx, args.listId, {
    completedTodoDelta: -todos.length,
    openTodoDelta: args.action === "uncheck" ? todos.length : 0,
    updatedAt: now,
  });

  if (todos.length === TODO_BATCH_SIZE) {
    await ctx.scheduler.runAfter(
      0,
      internal.system.todoBatches.processCompletedTodosBatch,
      args,
    );
  }
}

export const processCompletedTodosBatch = internalMutation({
  args: completedTodosArgs.fields,
  handler: processCompletedTodos,
});

/** Deletes the todos of a deleted list. Called by the todoLists delete trigger. */
export async function deleteListTodos(ctx: BatchCtx, listId: Id<"todoLists">) {
  const todos = await ctx.db
    .query("todos")
    .withIndex("by_list_id_completed_and_order", (q) => q.eq("listId", listId))
    .take(TODO_BATCH_SIZE);

  await Promise.all(todos.map((todo) => ctx.db.delete(todo._id)));

  if (todos.length === TODO_BATCH_SIZE) {
    await ctx.scheduler.runAfter(
      0,
      internal.system.todoBatches.deleteListTodosBatch,
      { listId },
    );
  }
}

export const deleteListTodosBatch = internalMutation({
  args: { listId: v.id("todoLists") },
  handler: (ctx, args) => deleteListTodos(ctx, args.listId),
});

/**
 * Deletes todos completed more than COMPLETED_TODO_RETENTION_MS ago, across
 * all lists. Runs daily from crons.ts. Todos without a `completedAt` are kept.
 */
export const deleteExpiredCompletedTodos = internalMutation({
  args: {},
  handler: async (ctx) => {
    const todos = await ctx.db
      .query("todos")
      .withIndex("by_completed_and_completed_at", (q) =>
        q
          .eq("isCompleted", true)
          .gte("completedAt", 0)
          .lt("completedAt", Date.now() - COMPLETED_TODO_RETENTION_MS),
      )
      .take(TODO_BATCH_SIZE);
    const deletedCounts = new Map<Id<"todoLists">, number>();

    for (const todo of todos) {
      await ctx.db.delete(todo._id);
      deletedCounts.set(todo.listId, (deletedCounts.get(todo.listId) ?? 0) + 1);
    }

    for (const [listId, count] of deletedCounts) {
      // Todos of a deleted list may still be waiting for deleteListTodos.
      if (await ctx.db.get(listId)) {
        await updateTodoListStats(ctx, listId, { completedTodoDelta: -count });
      }
    }

    if (todos.length === TODO_BATCH_SIZE) {
      await ctx.scheduler.runAfter(
        0,
        internal.system.todoBatches.deleteExpiredCompletedTodos,
        {},
      );
    }
  },
});

// Puts reopened todos last among the open todos of their section or list,
// keeping their completion order. Each bucket costs one read for its last order.
async function reopenTodos(ctx: BatchCtx, todos: Doc<"todos">[], now: number) {
  const nextOrders = new Map<Id<"todoSections"> | undefined, number>();

  for (const todo of todos) {
    const order =
      nextOrders.get(todo.sectionId) ??
      (await getLastOrder(ctx, { ...todo, isCompleted: false }));

    nextOrders.set(todo.sectionId, order + ORDER_STEP);
    await ctx.db.patch(todo._id, {
      isCompleted: false,
      completedAt: undefined,
      order,
      updatedAt: now,
    });
  }
}
