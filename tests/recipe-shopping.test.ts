import { expect, test } from "bun:test";
import { convexTest } from "convex-test";

import { api, components, internal } from "../convex/_generated/api";
import betterAuthSchema from "../convex/betterAuth/schema";
import schema from "../convex/schema";
import { modulesIn } from "./convex-modules";

// Test-process values only. No environment files or external services are used.
process.env.SITE_URL = "http://localhost:5174";
process.env.CONVEX_SITE_URL = "https://auth.example.test";
process.env.BETTER_AUTH_SECRET =
  "test-only-secret-not-for-use-outside-tests-123456789";

const RICE = "300 g rice";

// Two signed-in family members sharing a recipe list. Only the cook is on
// the shopping list.
async function setup() {
  const t = convexTest(schema, modulesIn("convex"));
  t.registerComponent(
    "betterAuth",
    betterAuthSchema,
    modulesIn("convex/betterAuth"),
  );

  const signIn = async (email: string) => {
    const now = Date.now();
    const authUser = await t.run((ctx) =>
      ctx.runMutation(components.betterAuth.adapter.create, {
        input: {
          model: "user",
          data: {
            email,
            name: email,
            emailVerified: true,
            createdAt: now,
            updatedAt: now,
          },
        },
      }),
    );
    const session = await t.run((ctx) =>
      ctx.runMutation(components.betterAuth.adapter.create, {
        input: {
          model: "session",
          data: {
            userId: authUser._id,
            token: `session-${email}`,
            expiresAt: now + 86400000,
            createdAt: now,
            updatedAt: now,
          },
        },
      }),
    );

    return {
      userId: `better-auth:${authUser._id}`,
      client: t.withIdentity({ subject: authUser._id, sessionId: session._id }),
    };
  };

  const cook = await signIn("cook@example.test");
  const guest = await signIn("guest@example.test");
  const ids = await t.run(async (ctx) => {
    const newList = (title: string, kind: "recipe" | "regular") =>
      ctx.db.insert("todoLists", {
        title,
        kind,
        userId: cook.userId,
        openTodoCount: 0,
        completedTodoCount: 0,
        memberCount: 1,
        updatedAt: 0,
      });
    const recipeListId = await newList("Recipes", "recipe");
    const shoppingListId = await newList("Shopping", "regular");

    for (const userId of [cook.userId, guest.userId]) {
      await ctx.db.insert("todoListUsers", { listId: recipeListId, userId });
    }
    await ctx.db.insert("todoListUsers", {
      listId: shoppingListId,
      userId: cook.userId,
    });

    const todoId = await ctx.db.insert("todos", {
      listId: recipeListId,
      title: { type: "doc", content: [] },
      isCompleted: false,
      order: 0,
      updatedAt: 0,
    });
    const recipeId = await ctx.db.insert("recipes", {
      listId: recipeListId,
      todoId,
      status: "ready",
      ingredients: [RICE, "1 onion"],
      steps: [],
      updatedAt: 0,
    });

    return { shoppingListId, recipeId };
  });

  return { cook, guest, ...ids };
}

test("an added line shows until it is checked off, once per list", async () => {
  const { cook, shoppingListId, recipeId } = await setup();
  const add = () =>
    cook.client.mutation(api.mutations.todos.createFromRecipe, {
      recipeId,
      ingredient: RICE,
      listId: shoppingListId,
      title: "600 g rice",
    });

  const todoId = await add();
  expect(await add()).toBe(todoId);
  expect(
    await cook.client.query(api.queries.recipes.shoppingLinks, { recipeId }),
  ).toMatchObject([
    { todoId, ingredient: RICE, list: { _id: shoppingListId } },
  ]);

  await cook.client.mutation(internal.mutations.todos.setCompletedForUser, {
    userId: cook.userId,
    todoId,
    completed: true,
  });
  expect(
    await cook.client.query(api.queries.recipes.shoppingLinks, { recipeId }),
  ).toEqual([]);
});

test("links into lists a viewer cannot open stay hidden and closed to them", async () => {
  const { cook, guest, shoppingListId, recipeId } = await setup();

  await cook.client.mutation(api.mutations.todos.createFromRecipe, {
    recipeId,
    ingredient: RICE,
    listId: shoppingListId,
    title: RICE,
  });

  expect(
    await guest.client.query(api.queries.recipes.shoppingLinks, { recipeId }),
  ).toEqual([]);
  await expect(
    guest.client.mutation(api.mutations.todos.createFromRecipe, {
      recipeId,
      ingredient: RICE,
      listId: shoppingListId,
      title: RICE,
    }),
  ).rejects.toThrow("Todo list was not found.");
});
