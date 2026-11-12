// Formatting for the saved recipe fields shown in rows and on the recipe page.

/** 45 -> "45 min", 70 -> "1 h 10 min", 120 -> "2 h". */
export function formatRecipeMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (hours === 0) {
    return `${rest} min`;
  }

  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

/** Sites send "4" or "Serves 4"; a bare number gets a unit. */
export function formatRecipeServings(servings: string) {
  return /^\d+$/.test(servings)
    ? `${servings} ${servings === "1" ? "serving" : "servings"}`
    : servings;
}

const INGREDIENT_QUANTITY_PATTERN =
  /^((?:\d+(?:[.,/]\d+)?|[½¼¾⅓⅔⅛])(?:\s*[½¼¾⅓⅔⅛])?(?:\s*[-–]\s*\d+(?:[.,/]\d+)?)?(?:\s*(?:kg|g|mg|ml|dl|cl|l|oz|lbs?|tsp|tbsp|cups?)\b\.?)?)\s+(\S.*)$/i;

/**
 * Splits a leading amount off an ingredient line so it can be emphasized:
 * "200-230 ml mlijeka" -> { quantity: "200-230 ml", name: "mlijeka" }.
 * Lines without a leading amount come back as the name only.
 */
export function splitIngredientQuantity(ingredient: string) {
  const match = ingredient.match(INGREDIENT_QUANTITY_PATTERN);

  return match
    ? { quantity: match[1], name: match[2] }
    : { quantity: null, name: ingredient };
}
