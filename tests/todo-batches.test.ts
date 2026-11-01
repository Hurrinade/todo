import { describe, expect, jest, test } from "bun:test";
import { convexTest } from "convex-test";

import { internal } from "../convex/_generated/api";
import type { Doc, Id } from "../convex/_generated/dataModel";
import schema from "../convex/schema";
import {
  COMPLETED_TODO_RETENTION_MS,
  TODO_BATCH_SIZE,
} from "../convex/system/todoBatches";
import { ORDER_STEP } from "../convex/shared/todoOrder";
import { modulesIn } from "./convex-modules";

type SeedTodo = Pick<Doc<"todos">, "isCompleted" | "order"> &
  Partial<Pick<Doc<"todos">, "completedAt">>;

// Seeds one list with the given todos and matching stats.
async function setup() {
  const t = convexTest(schema, modulesIn("convex"));
  const listId = await t.run((ctx) =>
    ctx.db.insert("todoLists", {
      title: "List",
      kind: "regular",
      userId: "user_test",
      openTodoCount: 0,
      completedTodoCount: 0,
      memberCount: 1,
      updatedAt: 0,
    }),
  );

  const insertTodos = (todos: SeedTodo[]) =>
    t.run(async (ctx) => {
      const ids: Id<"todos">[] = [];

      for (const todo of todos) {
        ids.push(
          await ctx.db.insert("todos", {
            listId,
            title: { type: "doc", content: [{ type: "paragraph" }] },
            updatedAt: 0,
            ...todo,
          }),
        );
      }

      const completed = todos.filter((todo) => todo.isCompleted).length;
      const list = await ctx.db.get(listId);
      await ctx.db.patch(listId, {
        openTodoCount: (list?.openTodoCount ?? 0) + todos.length - completed,
        completedTodoCount: (list?.completedTodoCount ?? 0) + completed,
      });

      return ids;
    });

  const readTodos = () =>
    t.run((ctx) =>
      ctx.db
        .query("todos")
        .withIndex("by_list_id_completed_and_order", (q) =>
          q.eq("listId", listId),
        )
        .collect(),
    );
  const readList = () => t.run((ctx) => ctx.db.get(listId));

  return { t, listId, insertTodos, readTodos, readList };
}

const completedAt = (time: number, order = time): SeedTodo => ({
  isCompleted: true,
  completedAt: time,
  order,
});

describe("completed todo batches", () => {
  test("clear continues in scheduled batches and keeps todos completed after the cutoff", async () => {
    jest.useFakeTimers();
    const { t, listId, insertTodos, readTodos, readList } = await setup();
    const total = TODO_BATCH_SIZE * 2 + 10;

    await insertTodos([
      ...Array.from({ length: total }, (_, index) => completedAt(index + 1)),
      completedAt(total + 100),
      { isCompleted: false, order: 0 },
    ]);
    await t.mutation(internal.system.todoBatches.processCompletedTodosBatch, {
      listId,
      action: "clear",
      completedBefore: total,
    });
    await t.finishAllScheduledFunctions(jest.runAllTimers);
    jest.useRealTimers();

    const todos = await readTodos();
    expect(todos.map((todo) => todo.completedAt)).toEqual([
      undefined,
      total + 100,
    ]);
    expect(await readList()).toMatchObject({
      openTodoCount: 1,
      completedTodoCount: 1,
    });
  });

  test("uncheck reopens todos last in their bucket, in completion order", async () => {
    const { t, listId, insertTodos, readTodos, readList } = await setup();
    const [open, completedLast, completedFirst] = await insertTodos([
      { isCompleted: false, order: 5 },
      completedAt(20, 0),
      completedAt(10, 1),
    ]);

    await t.mutation(internal.system.todoBatches.processCompletedTodosBatch, {
      listId,
      action: "uncheck",
      completedBefore: 30,
    });

    const todos = await readTodos();
    expect(
      todos.map((todo) => [todo._id, todo.order, todo.isCompleted]),
    ).toEqual([
      [open!, 5, false],
      [completedFirst!, 5 + ORDER_STEP, false],
      [completedLast!, 5 + 2 * ORDER_STEP, false],
    ]);
    expect(await readList()).toMatchObject({
      openTodoCount: 3,
      completedTodoCount: 0,
    });
  });
});

describe("completed todo retention", () => {
  test("deletes todos completed more than two weeks ago only", async () => {
    const { t, insertTodos, readTodos, readList } = await setup();
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    await insertTodos([
      completedAt(now - COMPLETED_TODO_RETENTION_MS - day),
      completedAt(now - COMPLETED_TODO_RETENTION_MS + day),
      // Legacy completed todo without a completion time.
      { isCompleted: true, order: 99 },
      { isCompleted: false, order: 0 },
    ]);
    await t.mutation(
      internal.system.todoBatches.deleteExpiredCompletedTodos,
      {},
    );

    const todos = await readTodos();
    expect(todos.map((todo) => todo.completedAt)).toEqual([
      undefined,
      undefined,
      now - COMPLETED_TODO_RETENTION_MS + day,
    ]);
    expect(await readList()).toMatchObject({
      openTodoCount: 1,
      completedTodoCount: 2,
    });
  });
});
