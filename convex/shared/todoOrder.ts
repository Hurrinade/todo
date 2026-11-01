import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

// Todos sort by a sparse `order` inside a bucket: the open or completed todos
// of one section (sectioned lists) or of one list (regular lists). A move
// writes one order between its neighbours. The bucket is renumbered only when
// that gap runs out, so older dense orders (0, 1, 2...) need no migration.
// The client imports the pure helpers for optimistic updates.

export const ORDER_STEP = 1024;

/** A todo or bucket descriptor. A `sectionId` selects the section bucket. */
export type TodoBucket = Pick<
  Doc<"todos">,
  "listId" | "sectionId" | "isCompleted"
>;

type TodoNeighbours = { lower?: Doc<"todos">; upper?: Doc<"todos"> };

type Ctx = Pick<MutationCtx, "db">;

/** Order strictly between two neighbours, or null when the gap has run out. */
export function getOrderBetween(lowerOrder?: number, upperOrder?: number) {
  if (lowerOrder === undefined && upperOrder === undefined) {
    return 0;
  }

  const nextOrder =
    lowerOrder === undefined
      ? upperOrder! - ORDER_STEP
      : upperOrder === undefined
        ? lowerOrder + ORDER_STEP
        : lowerOrder + (upperOrder - lowerOrder) / 2;

  if (
    !Number.isFinite(nextOrder) ||
    (lowerOrder !== undefined && nextOrder <= lowerOrder) ||
    (upperOrder !== undefined && nextOrder >= upperOrder)
  ) {
    return null;
  }

  return nextOrder;
}

/** Order that puts a new todo first in its bucket. */
export async function getFirstOrder(ctx: Ctx, bucket: TodoBucket) {
  const firstTodo = await queryTodoBucket(ctx, bucket).first();

  return firstTodo ? firstTodo.order - ORDER_STEP : 0;
}

/** Order that puts a todo entering the bucket last. */
export async function getLastOrder(ctx: Ctx, bucket: TodoBucket) {
  const lastTodo = await queryTodoBucket(ctx, bucket).order("desc").first();

  return lastTodo ? lastTodo.order + ORDER_STEP : 0;
}

/**
 * Neighbours of slot `index` in a bucket, ignoring the moved todo. Reads at
 * most `index + 2` todos. Omit `index` for the end of the bucket.
 */
export async function getNeighboursAtIndex(
  ctx: Ctx,
  bucket: TodoBucket,
  movedTodoId: Id<"todos">,
  index?: number,
): Promise<TodoNeighbours> {
  if (index === undefined) {
    const lastTodos = await queryTodoBucket(ctx, bucket).order("desc").take(2);

    return { lower: lastTodos.find((todo) => todo._id !== movedTodoId) };
  }

  const slot = Math.max(0, Math.floor(index));
  const todos = (await queryTodoBucket(ctx, bucket).take(slot + 2)).filter(
    (todo) => todo._id !== movedTodoId,
  );
  const clampedSlot = Math.min(slot, todos.length);

  return { lower: todos[clampedSlot - 1], upper: todos[clampedSlot] };
}

/** Neighbours of the slot right before or after `anchorTodo` in its bucket. */
export async function getNeighboursOfAnchor(
  ctx: Ctx,
  anchorTodo: Doc<"todos">,
  movedTodoId: Id<"todos">,
  placement: "before" | "after",
): Promise<TodoNeighbours> {
  const candidates = await queryTodoBucket(
    ctx,
    anchorTodo,
    placement === "before"
      ? { lt: anchorTodo.order }
      : { gt: anchorTodo.order },
  )
    .order(placement === "before" ? "desc" : "asc")
    .take(2);
  const adjacentTodo = candidates.find(
    (candidate) => candidate._id !== movedTodoId,
  );

  return placement === "before"
    ? { lower: adjacentTodo, upper: anchorTodo }
    : { lower: anchorTodo, upper: adjacentTodo };
}

/**
 * Places `todo` in `bucket` between its neighbours. Usually one patch. When
 * the gap has run out, the bucket is renumbered in multiples of ORDER_STEP;
 * those todos only get a new `order`, so their `updatedAt` stays accurate.
 */
export async function placeTodo(
  ctx: Ctx,
  todo: Doc<"todos">,
  bucket: TodoBucket,
  { lower, upper }: TodoNeighbours,
  now: number,
) {
  const movedFields = { sectionId: bucket.sectionId, updatedAt: now };
  const order = getOrderBetween(lower?.order, upper?.order);

  if (order !== null) {
    await ctx.db.patch(todo._id, { ...movedFields, order });
    return;
  }

  const todos = (await queryTodoBucket(ctx, bucket).collect()).filter(
    (current) => current._id !== todo._id,
  );
  const lowerIndex = lower
    ? todos.findIndex((current) => current._id === lower._id)
    : -1;

  todos.splice(lowerIndex + 1, 0, todo);

  await Promise.all(
    todos.flatMap((current, index) => {
      const nextOrder = index * ORDER_STEP;

      if (current._id === todo._id) {
        return [ctx.db.patch(todo._id, { ...movedFields, order: nextOrder })];
      }

      return current.order === nextOrder
        ? []
        : [ctx.db.patch(current._id, { order: nextOrder })];
    }),
  );
}

/** Todos of a bucket in ascending order, optionally bounded by an order. */
function queryTodoBucket(
  ctx: Ctx,
  bucket: TodoBucket,
  bound?: { lt: number } | { gt: number },
) {
  const todos = ctx.db.query("todos");
  const { sectionId, isCompleted } = bucket;

  if (sectionId) {
    return todos.withIndex("by_section_id_completed_and_order", (q) => {
      const range = q.eq("sectionId", sectionId).eq("isCompleted", isCompleted);

      return !bound
        ? range
        : "lt" in bound
          ? range.lt("order", bound.lt)
          : range.gt("order", bound.gt);
    });
  }

  return todos.withIndex("by_list_id_completed_and_order", (q) => {
    const range = q.eq("listId", bucket.listId).eq("isCompleted", isCompleted);

    return !bound
      ? range
      : "lt" in bound
        ? range.lt("order", bound.lt)
        : range.gt("order", bound.gt);
  });
}
