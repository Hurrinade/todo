import { expect, test } from "bun:test";

import {
  getServingCount,
  scaleIngredientQuantity,
  splitIngredientQuantity,
} from "../src/utils/recipe/recipe-utils";

test("splitIngredientQuantity separates leading amounts and units", () => {
  expect(splitIngredientQuantity("220 g maslaca ili margarina")).toEqual({
    quantity: "220 g",
    name: "maslaca ili margarina",
  });
  expect(splitIngredientQuantity("200-230 ml mlijeka").quantity).toBe(
    "200-230 ml",
  );
  expect(splitIngredientQuantity("50g dried porcini").quantity).toBe("50g");
  expect(splitIngredientQuantity("1 ½ l stock").quantity).toBe("1 ½ l");
  // A unit letter that starts a word stays in the name.
  expect(splitIngredientQuantity("2 garlic cloves")).toEqual({
    quantity: "2",
    name: "garlic cloves",
  });
  expect(splitIngredientQuantity("Salt to taste")).toEqual({
    quantity: null,
    name: "Salt to taste",
  });
});

test("scaleIngredientQuantity multiplies every amount in a quantity", () => {
  expect(scaleIngredientQuantity("200-230 ml", 2)).toBe("400-460 ml");
  expect(scaleIngredientQuantity("150 g", 1.5)).toBe("225 g");
  expect(scaleIngredientQuantity("1 ½ l", 0.5)).toBe("¾ l");
  expect(scaleIngredientQuantity("1 1/2 cups", 2)).toBe("3 cups");
  expect(scaleIngredientQuantity("1/2", 3)).toBe("1½");
  expect(scaleIngredientQuantity("3", 0.5)).toBe("1½");
  // Decimals keep the separator the site used.
  expect(scaleIngredientQuantity("1,5 dl", 1.5)).toBe("2,25 dl");
  expect(scaleIngredientQuantity("6", 4 / 6)).toBe("4");
  expect(scaleIngredientQuantity("50g", 1)).toBe("50g");
});

test("getServingCount reads the number a yield is counted in", () => {
  expect(getServingCount("4")).toBe(4);
  expect(getServingCount("Serves 6-8")).toBe(6);
  expect(getServingCount("A big pot")).toBeNull();
  expect(getServingCount(undefined)).toBeNull();
});
