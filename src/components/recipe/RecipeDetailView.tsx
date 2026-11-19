import { api } from "@convex/_generated/api";
import { getAppErrorMessage } from "@convex/shared/errors";
import { getRecipeHost, getRecipeLinkLabel } from "@convex/shared/recipe";
import { useMutation } from "convex/react";
import dayjs from "dayjs";
import {
  ArrowLeft,
  ArrowUpRight,
  Minus,
  Pencil,
  Plus,
  Save,
  Sun,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";

import {
  RECIPE_EDITOR_FORM_ID,
  RecipeEditor,
} from "@/components/recipe/RecipeEditor";
import { RECIPE_SECTION_HEADING } from "@/components/recipe/recipe-styles";
import { TodoDetailTitle } from "@/components/todo/TodoDetailTitle";
import { TodoNoteEditor } from "@/components/todo/TodoNoteEditor";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useModal, useWakeLock } from "@/hooks";
import { cn } from "@/lib/utils";
import { useNetworkStore } from "@/stores";
import type { RecipeDetailViewProps, TodoRecipe } from "@/types";
import {
  formatRecipeMinutes,
  formatRecipeServings,
  getServingCount,
  getTodoTitleText,
  OFFLINE_ACTION_MESSAGE,
  scaleIngredientQuantity,
  splitIngredientQuantity,
} from "@/utils";

/**
 * The todo detail view for recipe lists. With a photo, the title sits on it
 * and the recipe rises over it on a light sheet; without one, the sheet
 * starts under the header. TodoDetail picks this view when a todo has a recipe
 * and keys it by todo, so edit and cooking state start fresh per recipe.
 * Recipes typed by hand open in the editor until they have content.
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
  const isEmpty = recipe.ingredients.length === 0 && recipe.steps.length === 0;
  const [isEditing, setIsEditing] = useState(
    recipe.status === "ready" && isEmpty,
  );
  const canEdit = recipe.status !== "importing" && !isEditing;
  // Until the copy loads, show the whole link so it's clear which page it is,
  // unless the title already is that link.
  const showFullLink =
    recipe.sourceUrl !== undefined &&
    recipe.status !== "ready" &&
    getTodoTitleText(todo.title) !== getRecipeLinkLabel(recipe.sourceUrl);
  const handleEdit = canEdit
    ? () => {
        setIsEditing(true);
      }
    : undefined;
  const handleCancelEdit = isEditing
    ? () => {
        setIsEditing(false);
      }
    : undefined;
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
            onEdit={handleEdit}
            onCancelEdit={handleCancelEdit}
            presentation={presentation}
          />
          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 px-5 pb-12 @2xl:px-8">
            {recipe.sourceUrl ? (
              <SourceLink
                sourceUrl={recipe.sourceUrl}
                className="text-white/85"
                showFullLink={showFullLink}
              />
            ) : null}
            {title}
          </div>
        </div>
      ) : (
        <RecipeHeader
          detail={detail}
          onImage={false}
          onClose={onClose}
          onEdit={handleEdit}
          onCancelEdit={handleCancelEdit}
          presentation={presentation}
        />
      )}

      <div
        className={cn(
          "relative flex min-w-0 flex-col gap-8 bg-card px-5 pt-6 pb-[calc(2rem+env(safe-area-inset-bottom))] @2xl:px-8",
          // In dark mode a hairline keeps the sheet's edge off a dark photo.
          hasPhoto &&
            "-mt-7 rounded-t-[1.75rem] dark:shadow-[inset_0_1px_0_var(--border)]",
        )}
      >
        {hasPhoto ? null : (
          <div className="flex min-w-0 flex-col gap-1">
            {recipe.sourceUrl ? (
              <SourceLink
                sourceUrl={recipe.sourceUrl}
                className="text-primary"
                showFullLink={showFullLink}
              />
            ) : null}
            {title}
          </div>
        )}

        {errorMessage ? (
          <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </p>
        ) : null}

        {isEditing ? (
          <RecipeEditor
            todoId={todo._id}
            recipe={recipe}
            onDone={() => {
              setIsEditing(false);
            }}
          />
        ) : (
          <>
            <RecipeStatus
              todoId={todo._id}
              recipe={recipe}
              onEdit={handleEdit}
            />
            {recipe.status === "ready" && isEmpty ? (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
                <p>No ingredients or steps yet.</p>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={handleEdit}
                >
                  Write them in
                </Button>
              </div>
            ) : null}
            <RecipeOverview recipe={recipe} />
            <RecipeIngredients
              // Edited servings or lines reset the stepper and ticks.
              key={JSON.stringify([recipe.servings, recipe.ingredients])}
              recipe={recipe}
            />
            <RecipeMethod recipe={recipe} />
          </>
        )}

        <section className="flex min-w-0 flex-col gap-2.5">
          <label htmlFor="todo-description" className={RECIPE_SECTION_HEADING}>
            Notes
          </label>
          <TodoNoteEditor
            key={`${todo._id}-${JSON.stringify(todo.description ?? null)}`}
            description={todo.description}
            onUpdateDescription={onUpdateDescription}
          />
        </section>

        {recipe.importedAt && recipe.sourceUrl ? (
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

type RecipeHeaderProps = Pick<
  RecipeDetailViewProps,
  "detail" | "onClose" | "presentation"
> & {
  onImage: boolean;
  onEdit: (() => void) | undefined;
  /** Set while editing: the header then only offers save and cancel. */
  onCancelEdit: (() => void) | undefined;
};

// Back (page) or list name and close (panel), plus edit and delete. While
// editing, Save submits the editor and X cancels; both keep the recipe open. On a photo
// the buttons get a dark backdrop so they stay readable.
function RecipeHeader({
  detail,
  onImage,
  onClose,
  onEdit,
  onCancelEdit,
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

  const headerClassName = cn(
    "flex min-w-0 items-center justify-between gap-2 px-3 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-3 @2xl:px-5",
    onImage && "absolute inset-x-0 top-0",
  );

  if (onCancelEdit) {
    return (
      <header className={cn(headerClassName, "justify-end")}>
        <Button
          type="submit"
          form={RECIPE_EDITOR_FORM_ID}
          variant="ghost"
          size="icon-mobile-sm"
          disabled={!isOnline}
          aria-label="Save recipe"
          className={iconButtonClassName}
        >
          <Save className="size-4.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-mobile-sm"
          onClick={onCancelEdit}
          aria-label="Cancel editing"
          className={iconButtonClassName}
        >
          <X className="size-5" />
        </Button>
      </header>
    );
  }

  return (
    <header className={headerClassName}>
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
        {onEdit ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-mobile-sm"
            onClick={onEdit}
            aria-label="Edit recipe"
            className={iconButtonClassName}
          >
            <Pencil className="size-4.5" />
          </Button>
        ) : null}
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
  sourceUrl,
  className,
  showFullLink,
}: {
  sourceUrl: string;
  className: string;
  showFullLink: boolean;
}) {
  return (
    <a
      href={sourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex w-fit max-w-full items-center gap-1 rounded-sm text-sm underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/40",
        className,
      )}
    >
      <span className={showFullLink ? "break-all" : "truncate"}>
        {showFullLink
          ? getRecipeLinkLabel(sourceUrl)
          : getRecipeHost(sourceUrl)}
      </span>
      <ArrowUpRight className="size-3.5 shrink-0" />
    </a>
  );
}

// Saving and failure states. A failed copy keeps the link and offers a
// retry, or typing the recipe in by hand.
function RecipeStatus({
  todoId,
  recipe,
  onEdit,
}: {
  todoId: RecipeDetailViewProps["detail"]["todo"]["_id"];
  recipe: TodoRecipe;
  onEdit: (() => void) | undefined;
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
      {onEdit ? (
        <Button type="button" size="sm" variant="ghost" onClick={onEdit}>
          Type it in
        </Button>
      ) : null}
    </div>
  );
}

// Time, servings and size at a glance, with the keep-screen-on switch for
// cooking from the phone.
function RecipeOverview({ recipe }: { recipe: TodoRecipe }) {
  const servingCount = getServingCount(recipe.servings);
  const stats = [
    recipe.totalMinutes
      ? { label: "Total time", value: formatRecipeMinutes(recipe.totalMinutes) }
      : null,
    // A yield with a number shows just the number, so the label stays in
    // the app's language; one without, like "1 loaf", keeps the site's text.
    servingCount
      ? { label: "Servings", value: String(servingCount) }
      : recipe.servings
        ? { label: "Yield", value: recipe.servings }
        : null,
    recipe.ingredients.length > 0
      ? { label: "Ingredients", value: String(recipe.ingredients.length) }
      : null,
  ].filter((stat) => stat != null);
  const hasContent = recipe.ingredients.length > 0 || recipe.steps.length > 0;

  if (stats.length === 0 && !hasContent) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4 border-b border-border pb-6">
      {stats.length > 0 ? (
        <dl className="flex flex-wrap gap-x-8 gap-y-4">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col-reverse gap-0.5">
              <dt className="text-xs text-muted-foreground">{stat.label}</dt>
              <dd className="text-xl font-semibold tracking-tight tabular-nums">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      {hasContent ? <KeepScreenOnButton /> : null}
    </div>
  );
}

function KeepScreenOnButton() {
  const { isSupported, isOn, setIsOn } = useWakeLock();

  if (!isSupported) {
    return null;
  }

  return (
    <Button
      type="button"
      size="lg"
      variant={isOn ? "default" : "secondary"}
      aria-pressed={isOn}
      onClick={() => {
        setIsOn(!isOn);
      }}
    >
      <Sun />
      {isOn ? "Screen stays on" : "Keep screen on"}
    </Button>
  );
}

// Ticks are local, for checking the pantry while cooking. The stepper scales
// every leading amount to the chosen number of servings.
function RecipeIngredients({ recipe }: { recipe: TodoRecipe }) {
  const [checked, setChecked] = useState<ReadonlySet<number>>(new Set());
  const baseCount = getServingCount(recipe.servings);
  const [count, setCount] = useState(baseCount ?? 1);
  const factor = count / (baseCount ?? 1);
  const lines = recipe.ingredients.map(splitIngredientQuantity);

  if (lines.length === 0) {
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
      <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <h2 className={RECIPE_SECTION_HEADING}>
          Ingredients
          {checked.size > 0 ? (
            <span className="font-normal tracking-normal normal-case tabular-nums">
              {" "}
              · {checked.size} of {lines.length} ready
            </span>
          ) : null}
        </h2>
        {lines.some((line) => line.quantity) ? (
          <div className="-mr-2 flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-mobile-sm"
              disabled={count <= 1}
              onClick={() => {
                setCount(count - 1);
              }}
              aria-label="Fewer servings"
              className="rounded-full"
            >
              <Minus />
            </Button>
            <span
              aria-live="polite"
              className={cn(
                "min-w-20 text-center text-sm font-medium tabular-nums",
                factor !== 1 && "text-primary",
              )}
            >
              {baseCount ? formatRecipeServings(count) : `${count}× recipe`}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-mobile-sm"
              disabled={count >= 99}
              onClick={() => {
                setCount(count + 1);
              }}
              aria-label="More servings"
              className="rounded-full"
            >
              <Plus />
            </Button>
          </div>
        ) : null}
      </div>
      <ul className="grid min-w-0 gap-x-8 @xl:grid-cols-2">
        {lines.map(({ quantity, name }, index) => {
          const isChecked = checked.has(index);

          return (
            <li
              key={`${index}-${recipe.ingredients[index]}`}
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
                    <span
                      className={cn(
                        "font-semibold tabular-nums",
                        factor !== 1 && !isChecked && "text-primary",
                      )}
                    >
                      {scaleIngredientQuantity(quantity, factor)}{" "}
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

// Tapping a step marks it as the current one and dims the steps before it,
// so the cook keeps their place after looking away.
function RecipeMethod({ recipe }: { recipe: TodoRecipe }) {
  const [currentStep, setCurrentStep] = useState<number | null>(null);

  if (recipe.steps.length === 0) {
    return null;
  }

  return (
    <section className="flex min-w-0 flex-col gap-1">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <h2 className={RECIPE_SECTION_HEADING}>Method</h2>
        {currentStep == null ? (
          <span className="text-xs text-muted-foreground">
            Tap a step to mark your place
          </span>
        ) : null}
      </div>
      <ol className="flex flex-col">
        {recipe.steps.map((step, index) => {
          const isCurrent = currentStep === index;
          const isDone = currentStep != null && index < currentStep;

          return (
            <li key={`${index}-${step}`}>
              <button
                type="button"
                aria-current={isCurrent ? "step" : undefined}
                onClick={() => {
                  setCurrentStep(isCurrent ? null : index);
                }}
                className={cn(
                  "-mx-3 grid w-[calc(100%+1.5rem)] grid-cols-[2.75rem_minmax(0,1fr)] rounded-xl px-3 py-4 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
                  isCurrent && "bg-primary/10",
                  isDone && "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "text-2xl leading-tight font-semibold tracking-tight tabular-nums",
                    isDone ? "text-muted-foreground" : "text-primary",
                  )}
                >
                  {index + 1}
                </span>
                <span className="leading-relaxed wrap-break-word">{step}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
