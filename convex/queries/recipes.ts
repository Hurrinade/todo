import { v } from "convex/values";

import { query } from "../_generated/server";
import { requireAppUserId, requireListAccess } from "../shared/auth";

// The rows of a recipe list, newest first, with what each row shows. Recipe
// lists are family sized, so reading every recipe document here is fine.
export const list = query({
  args: {
    listId: v.id("todoLists"),
  },
  handler: async (ctx, args) => {
    const userId = await requireAppUserId(ctx);
    await requireListAccess(ctx, args.listId, userId);

    const [todos, recipes] = await Promise.all([
      ctx.db
        .query("todos")
        .withIndex("by_list_id_completed_and_order", (q) =>
          q.eq("listId", args.listId).eq("isCompleted", false),
        )
        .collect(),
      ctx.db
        .query("recipes")
        .withIndex("by_list_id", (q) => q.eq("listId", args.listId))
        .collect(),
    ]);
    const recipesByTodoId = new Map(
      recipes.map((recipe) => [recipe.todoId, recipe]),
    );

    return Promise.all(
      todos.map(async (todo) => {
        const recipe = recipesByTodoId.get(todo._id);

        return {
          _id: todo._id,
          listId: todo.listId,
          title: todo.title,
          recipe: recipe
            ? {
                status: recipe.status,
                sourceUrl: recipe.sourceUrl,
                totalMinutes: recipe.totalMinutes,
                servings: recipe.servings,
                imageUrl: recipe.imageId
                  ? await ctx.storage.getUrl(recipe.imageId)
                  : null,
              }
            : null,
        };
      }),
    );
  },
});
