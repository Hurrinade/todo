import { describe, expect, test } from "bun:test";

import {
  getRecipeLinkLabel,
  normalizeRecipeUrl,
  parsePageTitle,
  parseRecipeFromHtml,
} from "../convex/shared/recipe";

const PAGE_URL = "https://www.example.com/recipes/risotto";

function page(jsonLd: unknown, head = "") {
  return `<html><head>${head}<script type="application/ld+json">${JSON.stringify(jsonLd)}</script></head></html>`;
}

describe("parseRecipeFromHtml", () => {
  test("reads a recipe from a @graph with sectioned steps", () => {
    const recipe = parseRecipeFromHtml(
      page({
        "@context": "https://schema.org",
        "@graph": [
          { "@type": "WebPage", name: "Page" },
          {
            "@type": ["Recipe", "NewsArticle"],
            name: "Mushroom &amp; leek risotto",
            image: [{ "@type": "ImageObject", url: "/img/risotto.jpg" }],
            prepTime: "PT15M",
            cookTime: "PT1H",
            recipeYield: ["4", "4 servings"],
            recipeIngredient: ["300 g arborio rice", "1 &frac12; l stock"],
            recipeInstructions: [
              {
                "@type": "HowToSection",
                name: "Base",
                itemListElement: [
                  { "@type": "HowToStep", text: "<p>Fry the onion.</p>" },
                  { "@type": "HowToStep", text: "Add the rice." },
                ],
              },
              { "@type": "HowToStep", text: "Stir in the stock." },
            ],
          },
        ],
      }),
      PAGE_URL,
    );

    expect(recipe).toEqual({
      name: "Mushroom & leek risotto",
      imageUrl: "https://www.example.com/img/risotto.jpg",
      totalMinutes: 75,
      servings: "4 servings",
      ingredients: ["300 g arborio rice", "1 ½ l stock"],
      steps: ["Fry the onion.", "Add the rice.", "Stir in the stock."],
    });
  });

  test("splits one instruction block and falls back to og:image", () => {
    const recipe = parseRecipeFromHtml(
      page(
        {
          "@type": "Recipe",
          name: "Pancakes",
          totalTime: "P0DT1H5M",
          recipeYield: 8,
          recipeIngredient: ["2 eggs"],
          recipeInstructions: "Whisk.<br/>Fry.\nServe.",
        },
        '<meta property="og:image" content="https://cdn.example.com/p.jpg">',
      ),
      PAGE_URL,
    );

    expect(recipe?.steps).toEqual(["Whisk.", "Fry.", "Serve."]);
    expect(recipe?.totalMinutes).toBe(65);
    expect(recipe?.servings).toBe("8");
    expect(recipe?.imageUrl).toBe("https://cdn.example.com/p.jpg");
  });

  test("returns null without a usable recipe", () => {
    expect(parseRecipeFromHtml("<html></html>", PAGE_URL)).toBeNull();
    expect(
      parseRecipeFromHtml(page({ "@type": "Recipe", name: "Empty" }), PAGE_URL),
    ).toBeNull();
    expect(
      parseRecipeFromHtml(
        '<script type="application/ld+json">{broken</script>',
        PAGE_URL,
      ),
    ).toBeNull();
  });
});

test("parsePageTitle prefers og:title", () => {
  expect(
    parsePageTitle(
      '<title>Site</title><meta property="og:title" content="Lemon tart">',
    ),
  ).toBe("Lemon tart");
});

test("normalizeRecipeUrl adds https and rejects non-links", () => {
  expect(normalizeRecipeUrl(" coolinarika.com/recept/sarma ")).toBe(
    "https://coolinarika.com/recept/sarma",
  );
  expect(() => normalizeRecipeUrl("javascript:alert(1)")).toThrow();
  expect(() => normalizeRecipeUrl("grandma's soup")).toThrow();
});

test("getRecipeLinkLabel shows a readable link without protocol", () => {
  expect(
    getRecipeLinkLabel("https://recepti.index.hr/recept/330-snenokle/"),
  ).toBe("recepti.index.hr/recept/330-snenokle");
  expect(getRecipeLinkLabel("https://www.example.com/sarma-%C4%8Dorba")).toBe(
    "example.com/sarma-čorba",
  );
  expect(getRecipeLinkLabel("https://example.com/")).toBe("example.com");
});
