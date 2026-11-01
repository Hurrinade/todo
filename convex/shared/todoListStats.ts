import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { notFoundError } from "./errors";

type TodoListStatsUpdate = {
  openTodoCount?: number;
  completedTodoCount?: number;
  memberCount?: number;
  openTodoDelta?: number;
  completedTodoDelta?: number;
  memberDelta?: number;
  updatedAt?: number;
};

export async function updateTodoListStats(
  ctx: Pick<MutationCtx, "db">,
  listId: Id<"todoLists">,
  update: TodoListStatsUpdate,
) {
  const list = await ctx.db.get(listId);

  if (!list) {
    throw notFoundError("todoLists");
  }

  const nextStats = {
    openTodoCount: resolveCount(
      list.openTodoCount,
      update.openTodoCount,
      update.openTodoDelta,
    ),
    completedTodoCount: resolveCount(
      list.completedTodoCount,
      update.completedTodoCount,
      update.completedTodoDelta,
    ),
    memberCount: resolveCount(
      list.memberCount,
      update.memberCount,
      update.memberDelta,
    ),
  };

  await ctx.db.patch(listId, {
    ...nextStats,
    ...(update.updatedAt === undefined ? {} : { updatedAt: update.updatedAt }),
  });

  return nextStats;
}

function resolveCount(current: number, absolute?: number, delta = 0) {
  return Math.max(0, absolute ?? current + delta);
}
