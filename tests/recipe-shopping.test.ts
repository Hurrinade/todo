import { expect, test } from "bun:test";
import { convexTest } from "convex-test";
import { dirname, join } from "node:path";

import { api, components, internal } from "../convex/_generated/api";
import schema from "../convex/schema";
import { profileOwnerId } from "../convex/shared/auth";
import { registerPackageComponents } from "./auth-fixtures";
import { modulesIn } from "./convex-modules";

const RICE = "300 g rice";

// Two signed-in family members sharing a recipe list. Only the cook is on
// the shopping list.
async function setup() {
  const t = convexTest(schema, modulesIn("convex"));
  const authPackage = Bun.resolveSync(
    "@convex-dev/auth/package.json",
    import.meta.dir,
  );
  await registerPackageComponents(
    t,
    join(dirname(authPackage), "src/component"),
    "auth",
  );

  const signIn = async (email: string) => {
    const { userId, accessToken, refreshToken } = await t.run(async (ctx) => {
      const profileId = await ctx.db.insert("users", {
        email,
        updatedAt: Date.now(),
      });
      const profile = await ctx.db.get("users", profileId);
      if (!profile) throw new Error("Fixture profile missing.");
      const identity = await ctx.db.insert("authIdentities", { profileId });
      // Mint a real core session without running an email or OAuth flow.
      const tokens = await ctx.runMutation(
        components.auth.public._internal_dangerous_signIn,
        {
          userId: identity,
          claims: { method: "fixture", profile: {} },
          componentPath: "authEmail",
          accessTokenTtlSeconds: 60,
          refreshInactivityTimeoutSeconds: 86400,
          sessionMaxLifetimeSeconds: 86400,
        },
      );
      return {
        userId: profileOwnerId(profile),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    });
    const { sub, iss } = JSON.parse(
      Buffer.from(accessToken.split(".")[1], "base64url").toString(),
    );
    return {
      userId,
      refreshToken,
      client: t.withIdentity({ subject: sub, issuer: iss }),
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

    return { shoppingListId, recipeListId, recipeId, todoId };
  });

  return { t, cook, guest, ...ids };
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

test("live recipe reads clear after session revocation and writes still require sign-in", async () => {
  const { t, cook, guest, recipeListId, shoppingListId, recipeId, todoId } =
    await setup();
  expect(
    await cook.client.query(api.queries.recipes.list, { listId: recipeListId }),
  ).toMatchObject([{ _id: todoId }]);
  await expect(
    guest.client.query(api.queries.recipes.list, { listId: shoppingListId }),
  ).rejects.toThrow("Todo list was not found.");

  // A subscription can rerun with its original JWT after the session is deleted.
  await t.mutation(api.nativeAuth.signOut, { refreshToken: cook.refreshToken });
  expect(await cook.client.query(api.queries.todoLists.list, {})).toEqual([]);
  expect(
    await cook.client.query(api.queries.recipes.list, { listId: recipeListId }),
  ).toEqual([]);
  expect(
    await cook.client.query(api.queries.recipes.shoppingLinks, { recipeId }),
  ).toEqual([]);
  expect(await cook.client.query(api.queries.todos.get, { todoId })).toBeNull();
  await expect(
    cook.client.mutation(api.mutations.todos.createFromRecipe, {
      recipeId,
      ingredient: RICE,
      listId: shoppingListId,
      title: RICE,
    }),
  ).rejects.toThrow("You must be signed in.");
});
