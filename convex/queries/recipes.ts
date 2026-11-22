import { v } from "convex/values";

import { query } from "../_generated/server";
import { getAppUserId, requireListAccess } from "../shared/auth";

// The recipe lines still open on a list, from todos added with
// todos.createFromRecipe. Only lists the viewer belongs to are included, so a
// shared recipe never reveals someone else's private shopping list. Checking
// off or deleting the todo drops it from here, which frees the line again.
export const shoppingLinks = query({
  args: {
    recipeId: v.id("recipes"),
  },
  handler: async (ctx, args) => {
    const userId = await getAppUserId(ctx);
    if (!userId) return [];
    const recipe = await ctx.db.get(args.recipeId);

    // A recipe deleted while open shows no links instead of failing the page.
    if (!recipe) {
      return [];
    }

    await requireListAccess(ctx, recipe.listId, userId);

    const [todos, memberships] = await Promise.all([
      ctx.db
        .query("todos")
        .withIndex("by_from_recipe_and_completed", (q) =>
          q.eq("fromRecipe.recipeId", recipe._id).eq("isCompleted", false),
        )
        .collect(),
      ctx.db
        .query("todoListUsers")
        .withIndex("by_user_id", (q) => q.eq("userId", userId))
        .collect(),
    ]);
    const memberListIds = new Set(memberships.map(({ listId }) => listId));
    const visibleTodos = todos.filter(({ listId }) =>
      memberListIds.has(listId),
    );
    const lists = new Map(
      await Promise.all(
        [...new Set(visibleTodos.map(({ listId }) => listId))].map(
          async (listId) => [listId, await ctx.db.get(listId)] as const,
        ),
      ),
    );

    return visibleTodos.flatMap(({ _id, listId, fromRecipe }) => {
      const list = lists.get(listId);

      return list && fromRecipe
        ? [
            {
              todoId: _id,
              ingredient: fromRecipe.ingredient,
              list: { _id: list._id, title: list.title, emoji: list.emoji },
            },
          ]
        : [];
    });
  },
});

// The rows of a recipe list, newest first, with what each row shows. Recipe
// lists are family sized, so reading every recipe document here is fine.
export const list = query({
  args: {
    listId: v.id("todoLists"),
  },
  handler: async (ctx, args) => {
    const userId = await getAppUserId(ctx);
    if (!userId) return [];
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
