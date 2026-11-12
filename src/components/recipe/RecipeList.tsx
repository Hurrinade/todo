import { api } from "@convex/_generated/api";
import { getRecipeHost } from "@convex/shared/recipe";
import { useQuery } from "convex/react";
import { ChefHat, Link2 } from "lucide-react";
import { useNavigate } from "react-router";

import { TodoEmptyState } from "@/components/todo/TodoEmptyState";
import { cn } from "@/lib/utils";
import type { RecipeListItem, TodoListSummary } from "@/types";
import {
  formatRecipeMinutes,
  formatRecipeServings,
  getTodoTitleText,
} from "@/utils";

type RecipeListProps = {
  listId: TodoListSummary["_id"];
};

// A recipe list as a photo gallery. Each card opens the saved copy on the
// todo detail route, where recipes are also deleted.
export function RecipeList({ listId }: RecipeListProps) {
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
    <div className="@container">
      <ul className="grid grid-cols-2 gap-3 px-1 @xl:grid-cols-3 @4xl:grid-cols-4">
        {recipes.map((item) => (
          <li key={item._id} className="min-w-0">
            <RecipeCard item={item} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function RecipeCard({ item }: { item: RecipeListItem }) {
  const navigate = useNavigate();
  const title = getTodoTitleText(item.title);
  const { recipe } = item;

  return (
    <button
      type="button"
      onClick={() => {
        void navigate(`/home/todos/${item._id}`, {
          state: { selectedListId: item.listId },
        });
      }}
      className="group flex w-full min-w-0 flex-col overflow-hidden rounded-2xl bg-card text-left text-card-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
      aria-label={`Open ${title}`}
    >
      <div className="flex aspect-4/3 w-full items-center justify-center overflow-hidden bg-muted text-muted-foreground">
        {recipe?.imageUrl ? (
          <img
            src={recipe.imageUrl}
            alt=""
            loading="lazy"
            className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : recipe?.status === "importing" ? (
          <span className="text-sm">Saving a copy</span>
        ) : recipe?.status === "failed" ? (
          <Link2 className="size-6" />
        ) : (
          <ChefHat className="size-6" />
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-1 p-3">
        <p
          className={cn(
            "line-clamp-2 text-sm leading-snug font-semibold wrap-break-word",
            recipe?.status === "importing" && "text-muted-foreground",
          )}
        >
          {title}
        </p>
        {recipe ? (
          <p
            className={cn(
              "truncate text-xs",
              recipe.status === "failed"
                ? "text-destructive"
                : "text-muted-foreground",
            )}
          >
            {getRecipeCardDetails(recipe)}
          </p>
        ) : null}
      </div>
    </button>
  );
}

function getRecipeCardDetails(recipe: NonNullable<RecipeListItem["recipe"]>) {
  if (recipe.status === "importing") {
    return "Just added";
  }

  if (recipe.status === "failed") {
    return "Couldn't save a copy. Link kept";
  }

  const facts = [
    recipe.totalMinutes && formatRecipeMinutes(recipe.totalMinutes),
    recipe.servings && formatRecipeServings(recipe.servings),
  ].filter(Boolean);

  return facts.length > 0 ? facts.join(" · ") : getRecipeHost(recipe.sourceUrl);
}
