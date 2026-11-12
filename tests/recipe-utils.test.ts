import { expect, test } from "bun:test";

import { splitIngredientQuantity } from "../src/utils/recipe/recipe-utils";

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
