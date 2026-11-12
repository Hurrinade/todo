import { api } from "@convex/_generated/api";
import { getAppErrorMessage } from "@convex/shared/errors";
import { getRecipeHost } from "@convex/shared/recipe";
import { useMutation } from "convex/react";
import dayjs from "dayjs";
import { ArrowUpRight } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useNetworkStore } from "@/stores";
import type { TodoItem, TodoRecipe } from "@/types";
import {
  formatRecipeMinutes,
  formatRecipeServings,
  OFFLINE_ACTION_MESSAGE,
} from "@/utils";

// The saved recipe parts of the todo detail view: photo, facts under the
// title, and the ingredients and method. TodoDetailView places them.

export function RecipeHero({ recipe }: { recipe: TodoRecipe }) {
  if (!recipe.imageUrl) {
    return null;
  }

  return (
    <img
      src={recipe.imageUrl}
      alt=""
      className="aspect-video max-h-96 w-full rounded-2xl bg-muted object-cover"
    />
  );
}

type RecipeSummaryProps = {
  todoId: TodoItem["_id"];
  recipe: TodoRecipe;
};

export function RecipeSummary({ todoId, recipe }: RecipeSummaryProps) {
  const isOnline = useNetworkStore((state) => state.isOnline);
  const retryImport = useMutation(api.mutations.recipes.retryImport);
  const [retryError, setRetryError] = useState<string | null>(null);
  const facts = [
    recipe.totalMinutes && formatRecipeMinutes(recipe.totalMinutes),
    recipe.servings && formatRecipeServings(recipe.servings),
    recipe.ingredients.length > 0 && `${recipe.ingredients.length} ingredients`,
  ].filter((fact): fact is string => Boolean(fact));

  const handleRetry = async () => {
    if (!isOnline) {
      setRetryError(OFFLINE_ACTION_MESSAGE);
      return;
    }

    setRetryError(null);

    try {
      await retryImport({ todoId });
    } catch (error) {
      setRetryError(getAppErrorMessage(error) ?? "Something went wrong.");
    }
  };

  return (
    <div className="flex min-w-0 flex-col gap-2 text-sm">
      {facts.length > 0 ? (
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground tabular-nums">
          {facts.map((fact) => (
            <span key={fact}>{fact}</span>
          ))}
        </p>
      ) : null}

      <a
        href={recipe.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex w-fit max-w-full items-center gap-1 text-primary underline-offset-4 hover:underline"
      >
        <span className="truncate">{getRecipeHost(recipe.sourceUrl)}</span>
        <ArrowUpRight className="size-3.5 shrink-0" />
      </a>

      {recipe.status === "importing" ? (
        <p className="text-muted-foreground">Saving a copy of this page.</p>
      ) : null}

      {recipe.status === "failed" ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <p className="text-destructive">
            {retryError ??
              recipe.errorMessage ??
              "The copy could not be saved."}
          </p>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={!isOnline}
            onClick={handleRetry}
          >
            Try again
          </Button>
        </div>
      ) : null}
    </div>
  );
}

// Ingredients stack above the method, and sit beside it when the view is
// wide. Ticked ingredients are local, for checking the pantry while cooking.
export function RecipeContent({ recipe }: { recipe: TodoRecipe }) {
  const [checked, setChecked] = useState<ReadonlySet<number>>(new Set());

  if (recipe.ingredients.length === 0 && recipe.steps.length === 0) {
    return null;
  }

  const toggle = (index: number) => {
    setChecked((current) => {
      const next = new Set(current);

      if (!next.delete(index)) {
        next.add(index);
      }

      return next;
    });
  };

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="grid min-w-0 gap-8 @2xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] @2xl:gap-10">
        {recipe.ingredients.length > 0 ? (
          <section className="flex min-w-0 flex-col gap-2 @2xl:sticky @2xl:top-4 @2xl:self-start">
            <h2 className="text-base font-semibold">Ingredients</h2>
            <ul className="flex flex-col">
              {recipe.ingredients.map((ingredient, index) => (
                <li
                  key={`${index}-${ingredient}`}
                  className="border-b border-border last:border-b-0"
                >
                  <label className="flex cursor-pointer items-start gap-3 py-2.5 leading-snug">
                    <Checkbox
                      checked={checked.has(index)}
                      onCheckedChange={() => {
                        toggle(index);
                      }}
                      className="mt-px size-5"
                    />
                    <span
                      className={cn(
                        "min-w-0 wrap-break-word",
                        checked.has(index) &&
                          "text-muted-foreground line-through",
                      )}
                    >
                      {ingredient}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {recipe.steps.length > 0 ? (
          <section className="flex min-w-0 flex-col gap-3">
            <h2 className="text-base font-semibold">Method</h2>
            <ol className="flex flex-col gap-4">
              {recipe.steps.map((step, index) => (
                <li
                  key={`${index}-${step}`}
                  className="flex gap-3 leading-relaxed"
                >
                  <span className="w-5 shrink-0 font-semibold text-primary tabular-nums">
                    {index + 1}
                  </span>
                  <p className="min-w-0 wrap-break-word">{step}</p>
                </li>
              ))}
            </ol>
          </section>
        ) : null}
      </div>

      {recipe.importedAt ? (
        <p className="text-xs text-muted-foreground">
          Saved {dayjs(recipe.importedAt).format("D MMM YYYY")} from{" "}
          {getRecipeHost(recipe.sourceUrl)}
        </p>
      ) : null}
    </div>
  );
}
