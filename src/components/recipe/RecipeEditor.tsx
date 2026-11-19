import { api } from "@convex/_generated/api";
import { getAppErrorMessage } from "@convex/shared/errors";
import { useMutation } from "convex/react";
import { useState } from "react";

import { RECIPE_SECTION_HEADING } from "@/components/recipe/recipe-styles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useNetworkStore } from "@/stores";
import type { RecipeDetailViewProps, TodoRecipe } from "@/types";
import { OFFLINE_ACTION_MESSAGE } from "@/utils";

// Lets the Save button in the recipe header submit this form.
export const RECIPE_EDITOR_FORM_ID = "recipe-editor";

type RecipeEditorProps = {
  todoId: RecipeDetailViewProps["detail"]["todo"]["_id"];
  recipe: TodoRecipe;
  onDone: () => void;
};

/**
 * Edits a recipe as plain text: one ingredient per line, one step per line.
 * Fixes a copy a site got wrong, or fills in a recipe typed by hand.
 */
export function RecipeEditor({ todoId, recipe, onDone }: RecipeEditorProps) {
  const isOnline = useNetworkStore((state) => state.isOnline);
  const updateContent = useMutation(api.mutations.recipes.updateContent);
  const [minutes, setMinutes] = useState(
    recipe.totalMinutes ? String(recipe.totalMinutes) : "",
  );
  const [servings, setServings] = useState(recipe.servings ?? "");
  const [ingredients, setIngredients] = useState(recipe.ingredients.join("\n"));
  const [steps, setSteps] = useState(recipe.steps.join("\n\n"));
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event: React.SubmitEvent) => {
    event.preventDefault();

    if (isSaving) {
      return;
    }

    if (!isOnline) {
      setError(OFFLINE_ACTION_MESSAGE);
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      await updateContent({
        todoId,
        totalMinutes: minutes.trim() ? Number(minutes) : undefined,
        servings,
        ingredients: ingredients.split("\n"),
        steps: steps.split("\n"),
      });
      onDone();
    } catch (saveError) {
      setError(getAppErrorMessage(saveError) ?? "Couldn't save. Try again.");
      setIsSaving(false);
    }
  };

  return (
    <form
      id={RECIPE_EDITOR_FORM_ID}
      className="flex min-w-0 flex-col gap-6"
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
    >
      <div className="grid grid-cols-2 gap-4">
        <Field id="recipe-minutes" label="Total minutes">
          <Input
            id="recipe-minutes"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            value={minutes}
            onChange={(event) => {
              setMinutes(event.target.value);
            }}
            placeholder="45"
            className="h-11 pointer-fine:h-9"
          />
        </Field>
        <Field id="recipe-servings" label="Servings">
          <Input
            id="recipe-servings"
            value={servings}
            onChange={(event) => {
              setServings(event.target.value);
            }}
            placeholder="4"
            className="h-11 pointer-fine:h-9"
          />
        </Field>
      </div>

      <Field id="recipe-ingredients" label="Ingredients, one per line">
        <Textarea
          id="recipe-ingredients"
          value={ingredients}
          onChange={(event) => {
            setIngredients(event.target.value);
          }}
          placeholder={"500 g flour\n2 eggs\nPinch of salt"}
          className="min-h-40"
        />
      </Field>

      <Field id="recipe-steps" label="Method, one step per line">
        <Textarea
          id="recipe-steps"
          value={steps}
          onChange={(event) => {
            setSteps(event.target.value);
          }}
          placeholder={"Mix the flour, eggs and salt.\n\nBake for 30 minutes."}
          className="min-h-48"
        />
      </Field>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="lg" disabled={!isOnline || isSaving}>
          {isSaving ? "Saving" : "Save recipe"}
        </Button>
        <Button
          type="button"
          size="lg"
          variant="ghost"
          disabled={isSaving}
          onClick={onDone}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <label htmlFor={id} className={RECIPE_SECTION_HEADING}>
        {label}
      </label>
      {children}
    </div>
  );
}
