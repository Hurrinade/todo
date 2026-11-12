import { v } from "convex/values";

import { internal } from "../_generated/api";
import { mutation } from "../_generated/server";
import { requireAppUserId, requireListAccess } from "../shared/auth";
import { appError, notFoundError } from "../shared/errors";
import { getRecipeLinkLabel, normalizeRecipeUrl } from "../shared/recipe";
import { createTodoTitleContent } from "../shared/todo";
import { updateTodoListStats } from "../shared/todoListStats";
import { getFirstOrder } from "../shared/todoOrder";

// Saves a pasted link as a recipe todo right away, then copies the page
// content in the background. The todo shows the link until it loads.
export const create = mutation({
  args: {
    listId: v.id("todoLists"),
    url: v.string(),
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
      );
    }

    const sourceUrl = normalizeRecipeUrl(args.url);
    const now = Date.now();
    const todoId = await ctx.db.insert("todos", {
      listId: args.listId,
      title: createTodoTitleContent(getRecipeLinkLabel(sourceUrl)),
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
      status: "importing",
      ingredients: [],
      steps: [],
      updatedAt: now,
    });

    await updateTodoListStats(ctx, args.listId, {
      openTodoDelta: 1,
      updatedAt: now,
    });
    await ctx.scheduler.runAfter(0, internal.system.recipeImport.run, {
      recipeId,
    });

    return todoId;
  },
});

// Tries a failed import again, e.g. after the site was down.
export const retryImport = mutation({
  args: {
    todoId: v.id("todos"),
  },
  handler: async (ctx, args) => {
    const userId = await requireAppUserId(ctx);
    const todo = await ctx.db.get(args.todoId);

    if (!todo) {
      throw notFoundError("todos");
    }

    await requireListAccess(ctx, todo.listId, userId);
    const recipe = await ctx.db
      .query("recipes")
      .withIndex("by_todo_id", (q) => q.eq("todoId", todo._id))
      .unique();

    if (!recipe) {
      throw appError("not_found", "Recipe was not found.");
    }

    if (recipe.status === "importing") {
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
