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
