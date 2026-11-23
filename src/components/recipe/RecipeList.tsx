import { api } from "@convex/_generated/api";
import { getRecipeHost } from "@convex/shared/recipe";
import { useQuery } from "convex/react";
import { ChefHat, Link2, Search } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";

import { TodoEmptyState } from "@/components/todo/TodoEmptyState";
import { Input } from "@/components/ui/input";
import { useT } from "@/hooks";
import type { Messages } from "@/i18n";
import { cn } from "@/lib/utils";
import type { RecipeListItem, TodoListSummary } from "@/types";
import {
  getServingCount,
  getTodoTitleText,
  normalizeRecipeSearch,
} from "@/utils";

// Search shows once a list no longer fits on a phone screen.
const SEARCH_MIN_RECIPES = 7;

type RecipeListProps = {
  listId: TodoListSummary["_id"];
};

// A recipe list as a photo gallery. Each card opens the saved copy on the
// todo detail route, where recipes are also deleted.
export function RecipeList({ listId }: RecipeListProps) {
  const recipes = useQuery(api.queries.recipes.list, { listId });
  const [search, setSearch] = useState("");
  const t = useT();

  if (recipes === undefined) {
    return (
      <div className="flex min-h-40 items-center justify-center rounded-lg border border-border bg-card/55 text-sm text-muted-foreground">
        {t.recipe.loadingList}
      </div>
    );
  }

  if (recipes.length === 0) {
    return (
      <TodoEmptyState
        icon={ChefHat}
        title={t.recipe.empty}
        description={t.recipe.emptyDescription}
      />
    );
  }

  const query = normalizeRecipeSearch(search);
  const matches = query
    ? recipes.filter((item) =>
        normalizeRecipeSearch(
          `${getTodoTitleText(item.title)} ${item.recipe?.sourceUrl ?? ""}`,
        ).includes(query),
      )
    : recipes;

  return (
    <div className="@container flex flex-col gap-3">
      {recipes.length >= SEARCH_MIN_RECIPES ? (
        <div className="relative px-1">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            aria-label={t.recipe.search}
            placeholder={t.recipe.search}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
            }}
            className="h-11 pl-9 pointer-fine:h-9"
          />
        </div>
      ) : null}
      {matches.length === 0 ? (
        <p className="px-1 py-6 text-center text-sm text-muted-foreground">
          {t.recipe.noMatch(search.trim())}
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 px-1 @xl:grid-cols-3 @4xl:grid-cols-4">
          {matches.map((item) => (
            <li key={item._id} className="min-w-0">
              <RecipeCard item={item} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RecipeCard({ item }: { item: RecipeListItem }) {
  const navigate = useNavigate();
  const title = getTodoTitleText(item.title);
  const t = useT();
  const { recipe } = item;

  return (
    <button
      type="button"
      onClick={() => {
        void navigate(`/home/todos/${item._id}`, {
          state: { selectedListId: item.listId },
        });
      }}
      className="group flex size-full min-w-0 flex-col overflow-hidden rounded-2xl bg-card text-left text-card-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
      aria-label={t.recipe.open(title)}
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
          <span className="text-sm">{t.recipe.savingCopy}</span>
        ) : recipe?.status === "failed" ? (
          <span className="flex flex-col items-center gap-2 px-3 text-center text-sm">
            <Link2 className="size-6" />
            {t.recipe.cardFailed}
          </span>
        ) : (
          <ChefHat className="size-6" />
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-1 p-3">
        {/* Both lines keep their height when short or empty, so every card in
            the grid is the same size. */}
        <p
          className={cn(
            "line-clamp-2 min-h-[2lh] text-sm leading-snug font-semibold wrap-break-word",
            recipe?.status === "importing" && "text-muted-foreground",
          )}
        >
          {title}
        </p>
        <p className="min-h-[1lh] truncate text-xs text-muted-foreground">
          {recipe ? getRecipeCardDetails(recipe, t) : null}
        </p>
      </div>
    </button>
  );
}

function getRecipeCardDetails(
  recipe: NonNullable<RecipeListItem["recipe"]>,
  t: Messages,
) {
  if (recipe.status === "importing") {
    return t.recipe.justAdded;
  }

  // Yields with a number read in the app's words ("4 osobe" -> "4 servings");
  // ones without, like "1 loaf", keep the site's text.
  const servingCount = getServingCount(recipe.servings);
  const facts = [
    recipe.totalMinutes && t.recipe.minutes(recipe.totalMinutes),
    servingCount ? t.recipe.servings(servingCount) : recipe.servings,
  ].filter(Boolean);

  if (facts.length > 0) {
    return facts.join(" · ");
  }

  return recipe.sourceUrl
    ? getRecipeHost(recipe.sourceUrl)
    : t.recipe.typedByHand;
}
