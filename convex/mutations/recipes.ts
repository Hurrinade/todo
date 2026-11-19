import { v } from "convex/values";

import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { mutation, type MutationCtx } from "../_generated/server";
import { requireAppUserId, requireListAccess } from "../shared/auth";
import { appError, notFoundError } from "../shared/errors";
import {
  cleanRecipeContent,
  getRecipeLinkLabel,
  parseRecipeInput,
  recipeContentFields,
} from "../shared/recipe";
import { createTodoTitleContent } from "../shared/todo";
import { updateTodoListStats } from "../shared/todoListStats";
import { getFirstOrder } from "../shared/todoOrder";

/**
 * Adds a recipe from the composer or the share page. A link is saved right
 * away and its page copied in the background; the todo shows the link until
 * it loads. A name starts an empty recipe typed by hand.
 */
export const create = mutation({
  args: {
    listId: v.id("todoLists"),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAppUserId(ctx);
    await requireListAccess(ctx, args.listId, userId);
    const list = await ctx.db.get(args.listId);

    if (!list) {
      throw notFoundError("todoLists");
    }

    if (list.kind !== "recipe") {
      throw appError(
        "invalid_input",
        "Recipes can only be saved to recipe lists.",
        "recipeWrongList",
      );
    }

    const input = parseRecipeInput(args.text);
    const sourceUrl = input.kind === "link" ? input.sourceUrl : undefined;
    const title =
      input.kind === "link" ? getRecipeLinkLabel(input.sourceUrl) : input.name;

    if (sourceUrl) {
      const existing = await ctx.db
        .query("recipes")
        .withIndex("by_list_id_and_source_url", (q) =>
          q.eq("listId", args.listId).eq("sourceUrl", sourceUrl),
        )
        .first();

      if (existing) {
        throw appError(
          "conflict",
          "This recipe is already in this list.",
          "recipeExists",
        );
      }
    }

    const now = Date.now();
    const todoId = await ctx.db.insert("todos", {
      listId: args.listId,
      title: createTodoTitleContent(title),
      isCompleted: false,
      order: await getFirstOrder(ctx, {
        listId: args.listId,
        sectionId: undefined,
        isCompleted: false,
      }),
      updatedAt: now,
    });
    const recipeId = await ctx.db.insert("recipes", {
      listId: args.listId,
      todoId,
      sourceUrl,
      status: sourceUrl ? "importing" : "ready",
      ingredients: [],
      steps: [],
      updatedAt: now,
    });

    await updateTodoListStats(ctx, args.listId, {
      openTodoDelta: 1,
      updatedAt: now,
    });

    if (sourceUrl) {
      await ctx.scheduler.runAfter(0, internal.system.recipeImport.run, {
        recipeId,
      });
    }

    return { todoId, kind: input.kind };
  },
});

// Tries a failed import again, e.g. after the site was down.
export const retryImport = mutation({
  args: {
    todoId: v.id("todos"),
  },
  handler: async (ctx, args) => {
    const recipe = await requireRecipeForTodo(ctx, args.todoId);

    if (recipe.status === "importing" || !recipe.sourceUrl) {
      return;
    }

    await ctx.db.patch(recipe._id, {
      status: "importing",
      errorMessage: undefined,
      updatedAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.system.recipeImport.run, {
      recipeId: recipe._id,
    });
  },
});

/**
 * Saves ingredients, steps, time and servings typed in the app, fixing an
 * imported copy or filling in a recipe typed by hand. A failed import that
 * gets typed in counts as saved.
 */
export const updateContent = mutation({
  args: {
    todoId: v.id("todos"),
    ...recipeContentFields,
  },
  handler: async (ctx, { todoId, ...content }) => {
    const recipe = await requireRecipeForTodo(ctx, todoId);

    if (recipe.status === "importing") {
      throw appError(
        "conflict",
        "Wait until the copy is saved, then edit it.",
        "recipeImporting",
      );
    }

    await ctx.db.patch(recipe._id, {
      ...cleanRecipeContent(content),
      status: "ready",
      errorMessage: undefined,
      updatedAt: Date.now(),
    });
  },
});

async function requireRecipeForTodo(ctx: MutationCtx, todoId: Id<"todos">) {
  const userId = await requireAppUserId(ctx);
  const todo = await ctx.db.get(todoId);

  if (!todo) {
    throw notFoundError("todos");
  }

  await requireListAccess(ctx, todo.listId, userId);
  const recipe = await ctx.db
    .query("recipes")
    .withIndex("by_todo_id", (q) => q.eq("todoId", todo._id))
    .unique();

  if (!recipe) {
    throw appError("not_found", "Recipe was not found.", "recipeNotFound");
  }

  return recipe;
}
