import { expect, test } from "bun:test";
import { ConvexError } from "convex/values";

import { appError } from "../convex/shared/errors";
import { MESSAGES, translateAppError } from "../src/i18n";

test("translateAppError shows keyed server errors in the app language", () => {
  const keyed = appError(
    "conflict",
    "This recipe is already in this list.",
    "recipeExists",
  );
  const unkeyed = appError("invalid_input", "Title must be a single line.");

  expect(translateAppError(keyed, MESSAGES.hr)).toBe(
    "Ovaj recept je već na popisu.",
  );
  expect(translateAppError(keyed, MESSAGES.en)).toBe(
    "This recipe is already in this list.",
  );
  // English shows the server's own message; other languages fall back to the
  // caller's translated text instead of mixing in English.
  expect(translateAppError(unkeyed, MESSAGES.en)).toBe(
    "Title must be a single line.",
  );
  expect(translateAppError(unkeyed, MESSAGES.hr)).toBeNull();
  expect(
    translateAppError(new ConvexError({ key: "nope" }), MESSAGES.hr),
  ).toBeNull();
});

test("Croatian counts use the right plural form", () => {
  expect(MESSAGES.hr.recipe.servings(1)).toBe("1 porcija");
  expect(MESSAGES.hr.recipe.servings(3)).toBe("3 porcije");
  expect(MESSAGES.hr.recipe.servings(5)).toBe("5 porcija");
  expect(MESSAGES.hr.recipe.servings(22)).toBe("22 porcije");
});
