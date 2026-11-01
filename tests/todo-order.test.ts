import { describe, expect, test } from "bun:test";
import { convexTest } from "convex-test";

import type { Id } from "../convex/_generated/dataModel";
import schema from "../convex/schema";
import {
  getNeighboursAtIndex,
  ORDER_STEP,
  placeTodo,
} from "../convex/shared/todoOrder";
import { modulesIn } from "./convex-modules";

const CREATED_AT = 1;
const MOVED_AT = 2;

// Seeds one sectioned list with two sections holding open todos at the given
// orders. Dense legacy orders (0, 1, 2...) are the realistic starting point.
async function setup(firstOrders: number[], secondOrders: number[] = []) {
  const t = convexTest(schema, modulesIn("convex"));
  const ids = await t.run(async (ctx) => {
    const listId = await ctx.db.insert("todoLists", {
      title: "Sectioned",
      kind: "sectioned",
      userId: "user_test",
      openTodoCount: firstOrders.length + secondOrders.length,
      completedTodoCount: 0,
      memberCount: 1,
      updatedAt: CREATED_AT,
    });
    const insertSection = (title: string) =>
      ctx.db.insert("todoSections", {
        listId,
        title,
        isDefault: false,
        updatedAt: CREATED_AT,
      });
    const firstSectionId = await insertSection("First");
    const secondSectionId = await insertSection("Second");
    const insertTodos = (sectionId: Id<"todoSections">, orders: number[]) =>
      Promise.all(
        orders.map((order) =>
          ctx.db.insert("todos", {
            listId,
            sectionId,
            title: { type: "doc", content: [{ type: "paragraph" }] },
            isCompleted: false,
            order,
            updatedAt: CREATED_AT,
          }),
        ),
      );

    return {
      firstSectionId,
      secondSectionId,
      firstTodoIds: await insertTodos(firstSectionId, firstOrders),
      secondTodoIds: await insertTodos(secondSectionId, secondOrders),
    };
  });

  // Same steps as moveTodoForUser, without the auth checks.
  const move = (
    todoId: Id<"todos">,
    sectionId: Id<"todoSections">,
    index?: number,
  ) =>
    t.run(async (ctx) => {
      const todo = await ctx.db.get(todoId);

      if (!todo) {
        throw new Error("Todo was not found.");
      }

      const bucket = { ...todo, sectionId };
      const neighbours = await getNeighboursAtIndex(ctx, bucket, todoId, index);

      await placeTodo(ctx, todo, bucket, neighbours, MOVED_AT);
    });

  const readSection = (sectionId: Id<"todoSections">) =>
    t.run((ctx) =>
      ctx.db
        .query("todos")
        .withIndex("by_section_id_completed_and_order", (q) =>
          q.eq("sectionId", sectionId).eq("isCompleted", false),
        )
        .collect(),
    );

  return { ...ids, move, readSection };
}

describe("sectioned todo ordering", () => {
  test("a move within a section writes only the moved todo", async () => {
    const { firstSectionId, firstTodoIds, move, readSection } = await setup([
      0, 1, 2,
    ]);
    const [a, b, c] = firstTodoIds;

    await move(c!, firstSectionId, 0);

    const todos = await readSection(firstSectionId);
    expect(todos.map((todo) => todo._id)).toEqual([c!, a!, b!]);
    expect(todos.map((todo) => [todo.order, todo.updatedAt])).toEqual([
      [-ORDER_STEP, MOVED_AT],
      [0, CREATED_AT],
      [1, CREATED_AT],
    ]);
  });

  test("a move across sections lands between the target neighbours", async () => {
    const { secondSectionId, firstTodoIds, secondTodoIds, move, readSection } =
      await setup([0], [0, 1]);
    const [moved] = firstTodoIds;
    const [x, y] = secondTodoIds;

    await move(moved!, secondSectionId, 1);

    const todos = await readSection(secondSectionId);
    expect(todos.map((todo) => todo._id)).toEqual([x!, moved!, y!]);
    expect(todos.map((todo) => [todo.order, todo.updatedAt])).toEqual([
      [0, CREATED_AT],
      [0.5, MOVED_AT],
      [1, CREATED_AT],
    ]);
  });

  test("omitting the index moves to the end of the section", async () => {
    const { secondSectionId, firstTodoIds, secondTodoIds, move, readSection } =
      await setup([0], [0, 1]);
    const [moved] = firstTodoIds;

    await move(moved!, secondSectionId);

    const todos = await readSection(secondSectionId);
    expect(todos.map((todo) => todo._id)).toEqual([...secondTodoIds, moved!]);
    expect(todos.at(-1)?.order).toBe(1 + ORDER_STEP);
  });

  test("an exhausted gap rebalances order only", async () => {
    const { firstSectionId, firstTodoIds, move, readSection } = await setup([
      1,
      1 + Number.EPSILON,
      5,
    ]);
    const [a, b, moved] = firstTodoIds;

    await move(moved!, firstSectionId, 1);

    const todos = await readSection(firstSectionId);
    expect(todos.map((todo) => todo._id)).toEqual([a!, moved!, b!]);
    expect(todos.map((todo) => [todo.order, todo.updatedAt])).toEqual([
      [0, CREATED_AT],
      [ORDER_STEP, MOVED_AT],
      [2 * ORDER_STEP, CREATED_AT],
    ]);
  });
});
