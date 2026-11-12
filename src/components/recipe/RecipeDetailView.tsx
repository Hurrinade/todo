import { api } from "@convex/_generated/api";
import { getAppErrorMessage } from "@convex/shared/errors";
import { getRecipeHost, getRecipeLinkLabel } from "@convex/shared/recipe";
import { useMutation } from "convex/react";
import dayjs from "dayjs";
import { ArrowLeft, ArrowUpRight, Trash2, X } from "lucide-react";
import { useState } from "react";

import { TodoDetailTitle } from "@/components/todo/TodoDetailTitle";
import { TodoNoteEditor } from "@/components/todo/TodoNoteEditor";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useModal } from "@/hooks/modals/use-modal";
import { cn } from "@/lib/utils";
import { useNetworkStore } from "@/stores";
import type { RecipeDetailViewProps, TodoRecipe } from "@/types";
import {
  formatRecipeMinutes,
  getTodoTitleText,
  OFFLINE_ACTION_MESSAGE,
  splitIngredientQuantity,
} from "@/utils";

/**
 * The todo detail view for recipe lists. With a photo, the title sits on it
 * and the recipe rises over it on a light sheet; without one, the sheet
 * starts under the header. TodoDetail picks this view when a todo has a recipe.
 */
export function RecipeDetailView({
  detail,
  recipe,
  errorMessage,
  onClose,
  onRenameTodo,
  onUpdateDescription,
  presentation,
}: RecipeDetailViewProps) {
  const { todo } = detail;
  const hasPhoto = Boolean(recipe.imageUrl);
  // Until the copy loads, show the whole link so it's clear which page it is,
  // unless the title already is that link.
  const showFullLink =
    recipe.status !== "ready" &&
    getTodoTitleText(todo.title) !== getRecipeLinkLabel(recipe.sourceUrl);
  const title = (
    <TodoDetailTitle
      key={`${todo._id}-${JSON.stringify(todo.title)}`}
      todo={todo}
      onRenameTodo={onRenameTodo}
      className={cn(
        "[&_.ProseMirror]:text-[1.75rem] [&_.ProseMirror]:font-bold [&_.ProseMirror]:tracking-tight @2xl:[&_.ProseMirror]:text-4xl",
        hasPhoto &&
          "text-white data-[editing=true]:focus-within:bg-black/40 dark:data-[editing=true]:focus-within:bg-black/40 [&_a]:text-white",
      )}
    />
  );

  return (
    <main className="@container h-full w-full overflow-y-auto bg-card text-card-foreground">
      {hasPhoto ? (
        <div className="relative">
          <img
            src={recipe.imageUrl ?? undefined}
            alt=""
            className="aspect-4/3 max-h-[28rem] min-h-72 w-full object-cover @2xl:aspect-video"
          />
          <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-black/40 via-transparent via-35% to-black/80" />
          <RecipeHeader
            detail={detail}
            onImage
            onClose={onClose}
            presentation={presentation}
          />
          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 px-5 pb-12 @2xl:px-8">
            <SourceLink
              recipe={recipe}
              className="text-white/85"
              showFullLink={showFullLink}
            />
            {title}
          </div>
        </div>
      ) : (
        <RecipeHeader
          detail={detail}
          onImage={false}
          onClose={onClose}
          presentation={presentation}
        />
      )}

      <div
        className={cn(
          "relative flex min-w-0 flex-col gap-8 bg-card px-5 pt-6 pb-[calc(2rem+env(safe-area-inset-bottom))] @2xl:px-8",
          hasPhoto && "-mt-7 rounded-t-[1.75rem]",
        )}
      >
        {hasPhoto ? null : (
          <div className="flex min-w-0 flex-col gap-1">
            <SourceLink
              recipe={recipe}
              className="text-primary"
              showFullLink={showFullLink}
            />
            {title}
          </div>
        )}

        {errorMessage ? (
          <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </p>
        ) : null}

        <RecipeStatus todoId={todo._id} recipe={recipe} />
        <RecipeStats recipe={recipe} />
        <RecipeIngredients key={recipe._id} recipe={recipe} />
        <RecipeMethod recipe={recipe} />

        <section className="flex min-w-0 flex-col gap-2.5">
          <label htmlFor="todo-description" className={SECTION_HEADING}>
            Notes
          </label>
          <TodoNoteEditor
            key={`${todo._id}-${JSON.stringify(todo.description ?? null)}`}
            description={todo.description}
            onUpdateDescription={onUpdateDescription}
          />
        </section>

        {recipe.importedAt ? (
          <p className="text-xs text-muted-foreground">
            Saved {dayjs(recipe.importedAt).format("D MMM YYYY")} from{" "}
            {getRecipeHost(recipe.sourceUrl)}. This copy stays even if the page
            goes away.
          </p>
        ) : null}
      </div>
    </main>
  );
}

const SECTION_HEADING =
  "text-xs font-semibold tracking-widest text-muted-foreground uppercase";

type RecipeHeaderProps = Pick<
  RecipeDetailViewProps,
  "detail" | "onClose" | "presentation"
> & { onImage: boolean };

// Back (page) or list name and close (panel), plus delete. On a photo the
// buttons get a dark backdrop so they stay readable.
function RecipeHeader({
  detail,
  onImage,
  onClose,
  presentation,
}: RecipeHeaderProps) {
  const { openModal } = useModal();
  const isOnline = useNetworkStore((state) => state.isOnline);
  const removeTodo = useMutation(api.mutations.todos.remove);
  const { todo, list } = detail;
  const isPanel = presentation === "panel";
  const iconButtonClassName = cn(
    "shrink-0 rounded-full",
    onImage
      ? "bg-black/40 text-white hover:bg-black/55 hover:text-white dark:hover:bg-black/55"
      : "text-muted-foreground hover:text-foreground",
  );

  const handleDelete = () => {
    openModal("confirm", {
      title: "Delete recipe",
      message: "Delete this recipe and its saved copy?",
      confirmText: "Delete recipe",
      cancelText: "Keep recipe",
      variant: "danger",
      onConfirm: async () => {
        await removeTodo({ todoId: todo._id });
        onClose();
      },
    });
  };

  return (
    <header
      className={cn(
        "flex min-w-0 items-center justify-between gap-2 px-3 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-3 @2xl:px-5",
        onImage && "absolute inset-x-0 top-0",
      )}
    >
      {isPanel ? (
        <div
          className={cn(
            "flex min-w-0 items-center gap-2 px-2 text-sm font-semibold",
            onImage && "text-white [text-shadow:0_1px_2px_rgb(0_0_0/0.4)]",
          )}
        >
          {list.emoji ? (
            <span
              aria-hidden="true"
              className="shrink-0 text-base leading-none"
            >
              {list.emoji}
            </span>
          ) : null}
          <span className="block truncate">{list.title}</span>
        </div>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="icon-mobile-sm"
          onClick={onClose}
          aria-label="Back to recipes"
          className={iconButtonClassName}
        >
          <ArrowLeft className="size-5" />
        </Button>
      )}

      <div className="flex shrink-0 items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon-mobile-sm"
          disabled={!isOnline}
          onClick={handleDelete}
          aria-label="Delete recipe"
          className={iconButtonClassName}
        >
          <Trash2 className="size-4.5" />
        </Button>
        {isPanel ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-mobile-sm"
            onClick={onClose}
            aria-label="Close recipe"
            className={iconButtonClassName}
          >
            <X className="size-5" />
          </Button>
        ) : null}
      </div>
    </header>
  );
}

function SourceLink({
  recipe,
  className,
  showFullLink,
}: {
  recipe: TodoRecipe;
  className: string;
  showFullLink: boolean;
}) {
  return (
    <a
      href={recipe.sourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex w-fit max-w-full items-center gap-1 rounded-sm text-sm underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/40",
        className,
      )}
    >
      <span className={showFullLink ? "break-all" : "truncate"}>
        {showFullLink
          ? getRecipeLinkLabel(recipe.sourceUrl)
          : getRecipeHost(recipe.sourceUrl)}
      </span>
      <ArrowUpRight className="size-3.5 shrink-0" />
    </a>
  );
}

// Saving and failure states. A failed copy keeps the link and offers a retry.
function RecipeStatus({
  todoId,
  recipe,
}: {
  todoId: RecipeDetailViewProps["detail"]["todo"]["_id"];
  recipe: TodoRecipe;
}) {
  const isOnline = useNetworkStore((state) => state.isOnline);
  const retryImport = useMutation(api.mutations.recipes.retryImport);
  const [retryError, setRetryError] = useState<string | null>(null);

  if (recipe.status === "importing") {
    return (
      <p className="text-sm text-muted-foreground">
        Saving a copy of this page.
      </p>
    );
  }

  if (recipe.status !== "failed") {
    return null;
  }

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
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
      <p className="text-destructive">
        {retryError ?? recipe.errorMessage ?? "The copy could not be saved."}
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
  );
}

function RecipeStats({ recipe }: { recipe: TodoRecipe }) {
  const isServingCount = recipe.servings && /^\d+$/.test(recipe.servings);
  const stats = [
    recipe.totalMinutes
      ? { label: "Total time", value: formatRecipeMinutes(recipe.totalMinutes) }
      : null,
    recipe.servings
      ? {
          label: isServingCount ? "Servings" : "Yield",
          value: recipe.servings,
        }
      : null,
    recipe.ingredients.length > 0
      ? { label: "Ingredients", value: String(recipe.ingredients.length) }
      : null,
  ].filter((stat) => stat != null);

  if (stats.length === 0) {
    return null;
  }

  return (
    <dl className="flex flex-wrap gap-x-8 gap-y-4 border-b border-border pb-6">
      {stats.map((stat) => (
        <div key={stat.label} className="flex flex-col-reverse gap-0.5">
          <dt className="text-xs text-muted-foreground">{stat.label}</dt>
          <dd className="text-xl font-semibold tracking-tight tabular-nums">
            {stat.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

// Ticks are local, for checking the pantry while cooking.
function RecipeIngredients({ recipe }: { recipe: TodoRecipe }) {
  const [checked, setChecked] = useState<ReadonlySet<number>>(new Set());

  if (recipe.ingredients.length === 0) {
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
    <section className="flex min-w-0 flex-col gap-2">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className={SECTION_HEADING}>Ingredients</h2>
        {checked.size > 0 ? (
          <span className="text-xs text-muted-foreground tabular-nums">
            {checked.size} of {recipe.ingredients.length} ready
          </span>
        ) : null}
      </div>
      <ul className="grid min-w-0 gap-x-8 @xl:grid-cols-2">
        {recipe.ingredients.map((ingredient, index) => {
          const { quantity, name } = splitIngredientQuantity(ingredient);
          const isChecked = checked.has(index);

          return (
            <li
              key={`${index}-${ingredient}`}
              className="border-b border-border/60"
            >
              <label className="flex cursor-pointer items-start gap-3 py-2.5 leading-snug">
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={() => {
                    toggle(index);
                  }}
                  className="mt-px size-4.5 rounded-[5px]"
                />
                <span
                  className={cn(
                    "min-w-0 wrap-break-word",
                    isChecked && "text-muted-foreground line-through",
                  )}
                >
                  {quantity ? (
                    <span className="font-semibold tabular-nums">
                      {quantity}{" "}
                    </span>
                  ) : null}
                  {name}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function RecipeMethod({ recipe }: { recipe: TodoRecipe }) {
  if (recipe.steps.length === 0) {
    return null;
  }

  return (
    <section className="flex min-w-0 flex-col gap-1">
      <h2 className={SECTION_HEADING}>Method</h2>
      <ol className="flex flex-col">
        {recipe.steps.map((step, index) => (
          <li
            key={`${index}-${step}`}
            className="grid grid-cols-[2.75rem_minmax(0,1fr)] border-b border-border/60 py-4 last:border-b-0"
          >
            <span className="text-2xl leading-tight font-semibold tracking-tight text-primary tabular-nums">
              {index + 1}
            </span>
            <p className="leading-relaxed wrap-break-word">{step}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
