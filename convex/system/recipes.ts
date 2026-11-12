import { v } from "convex/values";

import type { Id } from "../_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
} from "../_generated/server";
import {
  getRecipeHost,
  getRecipeLinkLabel,
  recipeContentFields,
} from "../shared/recipe";
import { createTodoTitleContent, getTodoTitleText } from "../shared/todo";

// Reads and writes for system/recipeImport.ts. The recipe or its todo may be
// deleted while the page downloads, so the writes ignore missing documents.

export const getImport = internalQuery({
  args: { recipeId: v.id("recipes") },
  handler: async (ctx, args) => {
    const recipe = await ctx.db.get(args.recipeId);

    return recipe?.status === "importing"
      ? { sourceUrl: recipe.sourceUrl }
      : null;
  },
});

export const completeImport = internalMutation({
  args: {
    recipeId: v.id("recipes"),
    name: v.string(),
    imageId: v.optional(v.id("_storage")),
    ...recipeContentFields,
  },
  handler: async (ctx, { recipeId, name, imageId, ...content }) => {
    const recipe = await ctx.db.get(recipeId);
    const todo = recipe && (await ctx.db.get(recipe.todoId));

    if (!recipe || !todo) {
      if (imageId) {
        await ctx.storage.delete(imageId);
      }

      return;
    }

    const now = Date.now();

    if (recipe.imageId && imageId) {
      await ctx.storage.delete(recipe.imageId);
    }

    await ctx.db.patch(recipe._id, {
      ...content,
      status: "ready",
      errorMessage: undefined,
      imageId: imageId ?? recipe.imageId,
      importedAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(todo._id, {
      title: createTodoTitleContent(name),
      updatedAt: now,
    });
  },
});

export const failImport = internalMutation({
  args: {
    recipeId: v.id("recipes"),
    errorMessage: v.string(),
    pageTitle: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const recipe = await ctx.db.get(args.recipeId);
    const todo = recipe && (await ctx.db.get(recipe.todoId));

    if (!recipe || !todo) {
      return;
    }

    const now = Date.now();

    await ctx.db.patch(recipe._id, {
      status: "failed",
      errorMessage: args.errorMessage,
      updatedAt: now,
    });

    // Only replace the placeholder link, never a name the family chose.
    // Recipes saved before the link placeholder used the host name.
    const linkLabel = getRecipeLinkLabel(recipe.sourceUrl);
    const currentTitle = getTodoTitleText(todo.title);
    const nextTitle = args.pageTitle ?? linkLabel;

    if (
      (currentTitle === linkLabel ||
        currentTitle === getRecipeHost(recipe.sourceUrl)) &&
      currentTitle !== nextTitle
    ) {
      await ctx.db.patch(todo._id, {
        title: createTodoTitleContent(nextTitle),
        updatedAt: now,
      });
    }
  },
});

/** Deletes a todo's recipe and its stored image, if it has one. */
export async function deleteRecipeForTodo(
  ctx: Pick<MutationCtx, "db" | "storage">,
  todoId: Id<"todos">,
) {
  const recipe = await ctx.db
    .query("recipes")
    .withIndex("by_todo_id", (q) => q.eq("todoId", todoId))
    .unique();

  if (recipe) {
    await deleteRecipe(ctx, recipe._id, recipe.imageId);
  }
}

export async function deleteRecipe(
  ctx: Pick<MutationCtx, "db" | "storage">,
  recipeId: Id<"recipes">,
  imageId: Id<"_storage"> | undefined,
) {
  await ctx.db.delete(recipeId);

  if (imageId) {
    await ctx.storage.delete(imageId);
  }
}
