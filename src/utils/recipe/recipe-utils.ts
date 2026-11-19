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

/**
 * Servings in the app's own words, whatever language the site used:
 * 4 -> "4 servings". Pair with getServingCount for a saved yield.
 */
export function formatRecipeServings(count: number) {
  return `${count} ${count === 1 ? "serving" : "servings"}`;
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

const FRACTION_VALUES: Record<string, number> = {
  "½": 1 / 2,
  "¼": 1 / 4,
  "¾": 3 / 4,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
  "⅛": 1 / 8,
};
const NICE_FRACTIONS = Object.entries(FRACTION_VALUES);
const AMOUNT_PATTERN =
  /\d+\s+\d+\/\d+|\d+\s*[½¼¾⅓⅔⅛]|\d+\/\d+|\d+(?:[.,]\d+)?|[½¼¾⅓⅔⅛]/g;

/**
 * The number a yield is counted in, for the servings stepper:
 * "4" and "Serves 4" -> 4, "6-8 komada" -> 6. Null when it has none.
 */
export function getServingCount(servings: string | undefined) {
  const count = Number(servings?.match(/\d+/)?.[0]);

  return count > 0 ? count : null;
}

/**
 * Multiplies every amount in a quantity from splitIngredientQuantity:
 * ("200-230 ml", 2) -> "400-460 ml", ("1 ½ l", 0.5) -> "¾ l".
 * Decimals keep their separator; other amounts round to kitchen fractions.
 */
export function scaleIngredientQuantity(quantity: string, factor: number) {
  if (factor === 1) {
    return quantity;
  }

  return quantity.replace(AMOUNT_PATTERN, (amount) => {
    const value = parseAmount(amount);

    if (value == null) {
      return amount;
    }

    const decimalSeparator = amount.match(/^\d+([.,])\d+$/)?.[1];

    return formatAmount(value * factor, decimalSeparator);
  });
}

function parseAmount(amount: string) {
  const mixed = amount.match(/^(\d+)(?:\s+\d+\/\d+|\s*[½¼¾⅓⅔⅛])$/);
  const whole = mixed ? Number(mixed[1]) : 0;
  const fraction = mixed ? amount.slice(mixed[1].length).trim() : amount;
  const unicode: number | undefined = FRACTION_VALUES[fraction];

  if (unicode !== undefined) {
    return whole + unicode;
  }

  const [numerator, denominator] = fraction.split("/").map(Number);

  if (denominator !== undefined) {
    return denominator > 0 ? whole + numerator / denominator : null;
  }

  return Number(fraction.replace(",", "."));
}

function formatAmount(value: number, decimalSeparator: string | undefined) {
  if (decimalSeparator) {
    return String(Math.round(value * 100) / 100).replace(".", decimalSeparator);
  }

  if (value >= 10) {
    return String(Math.round(value));
  }

  const whole = Math.floor(value);
  const rest = value - whole;

  if (rest < 0.05 && whole > 0) {
    return String(whole);
  }

  if (rest > 0.95) {
    return String(whole + 1);
  }

  const nice = NICE_FRACTIONS.find(
    ([, fractionValue]) => Math.abs(rest - fractionValue) < 0.04,
  );

  if (nice) {
    return whole > 0 ? `${whole}${nice[0]}` : nice[0];
  }

  return String(Math.round(value * 10) / 10 || Math.round(value * 100) / 100);
}

/**
 * Search that ignores case and accents, so "snenokle" finds "Šnenokle".
 */
export function normalizeRecipeSearch(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}
