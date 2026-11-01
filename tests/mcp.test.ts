import { describe, expect, test } from "bun:test";
import { convexTest } from "convex-test";
import { ConvexError } from "convex/values";

import { internal } from "../convex/_generated/api";
import { runMcpTool } from "../convex/mcp/format";
import schema from "../convex/schema";
import { appError } from "../convex/shared/errors";
import { getTodoTitleText } from "../convex/shared/todo";
import { modulesIn } from "./convex-modules";

const userId = "user_agent_owner";

async function setup() {
  const t = convexTest(schema, modulesIn("convex"));
  const regularListId = await t.mutation(
    internal.mutations.todoLists.createForUser,
    { userId, title: "Regular", kind: "regular" },
  );
  const sectionedListId = await t.mutation(
    internal.mutations.todoLists.createForUser,
    { userId, title: "Sectioned", kind: "sectioned" },
  );

  return { t, regularListId, sectionedListId };
}

async function expectAppError(promise: Promise<unknown>, code: string) {
  const error = await promise.then(
    () => null,
    (reason: unknown) => reason,
  );

  expect(error).toBeInstanceOf(ConvexError);
  expect(error instanceof ConvexError ? error.data.code : null).toBe(code);
}

describe("MCP todo functions", () => {
  test("batch create keeps input order and updates each list once", async () => {
    const { t, regularListId, sectionedListId } = await setup();
    const records = await t.mutation(
      internal.mutations.todos.createManyForUser,
      {
        userId,
        todos: [
          { listId: regularListId, title: "First" },
          { listId: sectionedListId, title: "Sectioned", description: "Note" },
          { listId: regularListId, title: "Second" },
        ],
      },
    );

    expect(records.map(({ todo }) => getTodoTitleText(todo.title))).toEqual([
      "First",
      "Sectioned",
      "Second",
    ]);
    expect(records[1].section?.isDefault).toBe(true);

    const lists = await t.query(internal.mcp.queries.listTodoLists, { userId });
    const openCounts = Object.fromEntries(
      lists.map(({ list }) => [list._id, list.openTodoCount]),
    );
    expect(openCounts).toEqual({ [regularListId]: 2, [sectionedListId]: 1 });

    const page = await t.query(internal.mcp.queries.listTodos, {
      userId,
      listId: regularListId,
      completed: false,
      limit: 10,
    });
    expect(page.records.map(({ todo }) => todo._id)).toEqual([
      records[0].todo._id,
      records[2].todo._id,
    ]);
  });

  test("batch create is atomic", async () => {
    const { t, regularListId } = await setup();

    await expectAppError(
      t.mutation(internal.mutations.todos.createManyForUser, {
        userId,
        todos: [
          { listId: regularListId, title: "Valid" },
          { listId: regularListId, title: "   " },
        ],
      }),
      "invalid_input",
    );

    const lists = await t.query(internal.mcp.queries.listTodoLists, { userId });
    expect(lists.map(({ list }) => list.openTodoCount)).toEqual([0, 0]);
  });

  test("malformed and foreign IDs fail as not found", async () => {
    const { t, regularListId } = await setup();

    await expectAppError(
      t.query(internal.mcp.queries.getTodo, { userId, todoId: "not-an-id" }),
      "not_found",
    );
    await expectAppError(
      t.mutation(internal.mutations.todos.createManyForUser, {
        userId,
        todos: [{ listId: "not-an-id", title: "Lost" }],
      }),
      "not_found",
    );
    // A valid ID from another table is not a todo either.
    await expectAppError(
      t.mutation(internal.mutations.todos.setCompletedForUser, {
        userId,
        todoId: regularListId,
        completed: true,
      }),
      "not_found",
    );
    await expectAppError(
      t.query(internal.mcp.queries.listTodos, {
        userId: "user_someone_else",
        listId: regularListId,
        completed: false,
        limit: 10,
      }),
      "not_found",
    );
  });

  test("list todos pages across lists with one cursor", async () => {
    const { t, regularListId, sectionedListId } = await setup();
    await t.mutation(internal.mutations.todos.createManyForUser, {
      userId,
      todos: ["A", "B", "C"].map((title) => ({
        listId: regularListId,
        title,
      })),
    });
    const [completed] = await t.mutation(
      internal.mutations.todos.createManyForUser,
      { userId, todos: [{ listId: sectionedListId, title: "Done" }] },
    );
    await t.mutation(internal.mutations.todos.setCompletedForUser, {
      userId,
      todoId: completed.todo._id,
      completed: true,
    });

    const titles: string[] = [];
    let cursor: string | undefined;

    do {
      const page = await t.query(internal.mcp.queries.listTodos, {
        userId,
        completed: false,
        limit: 2,
        cursor,
      });
      titles.push(
        ...page.records.map(({ todo }) => getTodoTitleText(todo.title)),
      );
      cursor = page.nextCursor ?? undefined;
    } while (cursor);

    // Open todos only, and the sectioned list is skipped because it has none.
    expect(titles).toEqual(["A", "B", "C"]);
  });

  test("tools only expose app error messages", async () => {
    const appFailure = await runMcpTool(() =>
      Promise.reject(appError("not_found", "Todo was not found.")),
    );
    const internalFailure = await runMcpTool(() =>
      Promise.reject(new Error("Index by_secret is missing.")),
    );

    expect(appFailure.content[0]?.text).toBe("Todo was not found.");
    expect(internalFailure.content[0]?.text).toBe(
      "The RiTodo operation could not be completed.",
    );
  });
});
