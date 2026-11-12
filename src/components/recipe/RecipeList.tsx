import { api } from "@convex/_generated/api";
import { getRecipeHost } from "@convex/shared/recipe";
import { useQuery } from "convex/react";
import { ChefHat, Link2, Trash2 } from "lucide-react";
import { useNavigate } from "react-router";

import { SwipeAction } from "@/components/common/SwipeAction";
import { TodoEmptyState } from "@/components/todo/TodoEmptyState";
import { Button } from "@/components/ui/button";
import { useModal } from "@/hooks/modals/use-modal";
import { cn } from "@/lib/utils";
import { useNetworkStore } from "@/stores";
import type { RecipeListItem, TodoListSummary } from "@/types";
import {
  formatRecipeMinutes,
  formatRecipeServings,
  getTodoTitleText,
} from "@/utils";

type RecipeListProps = {
  listId: TodoListSummary["_id"];
  onDeleteRecipe: (todoId: RecipeListItem["_id"]) => Promise<void>;
};

// The rows of a recipe list. Each opens the saved copy on the todo detail route.
export function RecipeList({ listId, onDeleteRecipe }: RecipeListProps) {
  const recipes = useQuery(api.queries.recipes.list, { listId });

  if (recipes === undefined) {
    return (
      <div className="flex min-h-40 items-center justify-center rounded-lg border border-border bg-card/55 text-sm text-muted-foreground">
        Loading recipes
      </div>
    );
  }

  if (recipes.length === 0) {
    return (
      <TodoEmptyState
        icon={ChefHat}
        title="No recipes yet"
        description="Paste a recipe link below. A copy is saved here, so it stays readable even if the site goes away."
      />
    );
  }

  return (
    <ul className="flex flex-col">
      {recipes.map((item) => (
        <li key={item._id}>
          <RecipeListRow item={item} onDeleteRecipe={onDeleteRecipe} />
        </li>
      ))}
    </ul>
  );
}

type RecipeListRowProps = {
  item: RecipeListItem;
  onDeleteRecipe: RecipeListProps["onDeleteRecipe"];
};

function RecipeListRow({ item, onDeleteRecipe }: RecipeListRowProps) {
  const navigate = useNavigate();
  const { openModal } = useModal();
  const isOnline = useNetworkStore((state) => state.isOnline);
  const title = getTodoTitleText(item.title);
  const { recipe } = item;

  return (
    <SwipeAction
      actions={
        <Button
          type="button"
          size="icon"
          variant="ghost"
          disabled={!isOnline}
          onClick={() => {
            openModal("confirm", {
              title: "Delete recipe",
              message: `Delete "${title}" and its saved copy?`,
              confirmText: "Delete recipe",
              cancelText: "Keep recipe",
              variant: "danger",
              onConfirm: () => onDeleteRecipe(item._id),
            });
          }}
          aria-label="Delete recipe"
          className="h-full flex-1 rounded-none bg-destructive/10 text-destructive hover:bg-destructive/15 hover:text-destructive dark:hover:bg-destructive/25! dark:hover:text-destructive/80!"
        >
          <Trash2 />
        </Button>
      }
      actionWidth={56}
      className="w-full min-w-0 max-w-full"
      contentClassName="p-1 md:p-2"
      ariaLabel="Recipe actions"
    >
      <button
        type="button"
        onClick={() => {
          void navigate(`/home/todos/${item._id}`, {
            state: { selectedListId: item.listId },
          });
        }}
        className="flex w-full min-w-0 items-center gap-3 rounded-lg text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
        aria-label={`Open ${title}`}
      >
        <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted text-muted-foreground">
          {recipe?.imageUrl ? (
            <img
              src={recipe.imageUrl}
              alt=""
              loading="lazy"
              className="size-full object-cover"
            />
          ) : recipe?.status === "failed" ? (
            <Link2 className="size-5" />
          ) : recipe?.status === "ready" ? (
            <ChefHat className="size-5" />
          ) : null}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p
            className={cn(
              "truncate font-medium",
              recipe?.status === "importing"
                ? "text-muted-foreground"
                : "text-foreground",
            )}
          >
            {title}
          </p>
          {recipe ? (
            <p
              className={cn(
                "truncate text-sm",
                recipe.status === "failed"
                  ? "text-destructive"
                  : "text-muted-foreground",
              )}
            >
              {getRecipeRowDetails(recipe)}
            </p>
          ) : null}
        </div>
      </button>
    </SwipeAction>
  );
}

function getRecipeRowDetails(recipe: NonNullable<RecipeListItem["recipe"]>) {
  if (recipe.status === "importing") {
    return "Saving a copy";
  }

  if (recipe.status === "failed") {
    return "Couldn't save a copy. Link kept";
  }

  return [
    recipe.totalMinutes && formatRecipeMinutes(recipe.totalMinutes),
    recipe.servings && formatRecipeServings(recipe.servings),
    getRecipeHost(recipe.sourceUrl),
  ]
    .filter(Boolean)
    .join(" · ");
}
