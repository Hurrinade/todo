import { expect, test } from "bun:test";
import { convexTest } from "convex-test";

import { internal } from "../convex/_generated/api";
import schema from "../convex/schema";
import {
  createTodoTitleContent,
  getTodoTitleText,
} from "../convex/shared/todo";
import { modulesIn } from "./convex-modules";

const userId = "user_test";

// Seeds a recipe list with one recipe that is still importing.
async function setup() {
  const t = convexTest(schema, modulesIn("convex"));
  const ids = await t.run(async (ctx) => {
    const listId = await ctx.db.insert("todoLists", {
      title: "Recipes",
      kind: "recipe",
      userId,
      openTodoCount: 1,
      completedTodoCount: 0,
      memberCount: 1,
      updatedAt: 0,
    });
    await ctx.db.insert("todoListUsers", { listId, userId });
    const todoId = await ctx.db.insert("todos", {
      listId,
      title: createTodoTitleContent("example.com"),
      isCompleted: false,
      order: 0,
      updatedAt: 0,
    });
    const recipeId = await ctx.db.insert("recipes", {
      listId,
      todoId,
      sourceUrl: "https://www.example.com/risotto",
      status: "importing",
      ingredients: [],
      steps: [],
      updatedAt: 0,
    });

    return { listId, todoId, recipeId };
  });

  return { t, ...ids };
}

test("a finished import names the todo and deleting it removes the copy", async () => {
  const { t, todoId, recipeId } = await setup();
  const imageId = await t.run((ctx) => ctx.storage.store(new Blob(["img"])));

  await t.mutation(internal.system.recipes.completeImport, {
    recipeId,
    name: "Risotto",
    imageId,
    ingredients: ["rice"],
    steps: ["Stir."],
  });

  const saved = await t.run(async (ctx) => ({
    todo: await ctx.db.get(todoId),
    recipe: await ctx.db.get(recipeId),
  }));
  expect(saved.todo && getTodoTitleText(saved.todo.title)).toBe("Risotto");
  expect(saved.recipe).toMatchObject({ status: "ready", imageId });

  await t.mutation(internal.mutations.todos.removeForUser, { userId, todoId });

  const removed = await t.run(async (ctx) => ({
    recipe: await ctx.db.get(recipeId),
    image: await ctx.storage.getUrl(imageId),
  }));
  expect(removed).toEqual({ recipe: null, image: null });
});

test("recipe todos cannot be completed or created as plain todos", async () => {
  const { t, listId, todoId } = await setup();

  await expect(
    t.mutation(internal.mutations.todos.setCompletedForUser, {
      userId,
      todoId,
      completed: true,
    }),
  ).rejects.toThrow("Recipes cannot be completed.");
  await expect(
    t.mutation(internal.mutations.todos.createManyForUser, {
      userId,
      todos: [{ listId, title: "Soup" }],
    }),
  ).rejects.toThrow("Recipe lists only take recipe links");
});
