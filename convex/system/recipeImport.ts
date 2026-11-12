import { v } from "convex/values";

import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { internalAction, type ActionCtx } from "../_generated/server";
import { parsePageTitle, parseRecipeFromHtml } from "../shared/recipe";

const FETCH_TIMEOUT_MS = 15_000;
const MAX_PAGE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
// Many recipe sites turn away requests that don't look like a browser.
const REQUEST_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36",
  "Accept-Language": "en,hr;q=0.8",
};

/**
 * Downloads a recipe page, copies its recipe and main image into Convex, and
 * marks the recipe ready. Scheduled by mutations/recipes.ts. Failures keep
 * the link so the family can still open the page or retry.
 */
export const run = internalAction({
  args: { recipeId: v.id("recipes") },
  handler: async (ctx, args) => {
    try {
      await importRecipe(ctx, args.recipeId);
    } catch (error) {
      // Never leave a recipe stuck on "saving".
      console.error("Recipe import failed", error);
      await ctx.runMutation(internal.system.recipes.failImport, {
        recipeId: args.recipeId,
        errorMessage: "Something went wrong while saving the copy.",
      });
    }
  },
});

async function importRecipe(ctx: ActionCtx, recipeId: Id<"recipes">) {
  const recipeImport = await ctx.runQuery(internal.system.recipes.getImport, {
    recipeId,
  });

  if (!recipeImport) {
    return;
  }

  const page = await fetchWithLimit(recipeImport.sourceUrl, {
    accept: "text/html,application/xhtml+xml",
    maxBytes: MAX_PAGE_BYTES,
  });

  if (!page) {
    await ctx.runMutation(internal.system.recipes.failImport, {
      recipeId,
      errorMessage: "The page could not be opened.",
    });
    return;
  }

  const html = await page.blob.text();
  const recipe = parseRecipeFromHtml(html, page.url);

  if (!recipe) {
    await ctx.runMutation(internal.system.recipes.failImport, {
      recipeId,
      errorMessage: "No recipe was found on this page.",
      pageTitle: parsePageTitle(html),
    });
    return;
  }

  const { imageUrl, ...content } = recipe;
  const image = imageUrl
    ? await fetchWithLimit(imageUrl, {
        accept: "image/*",
        maxBytes: MAX_IMAGE_BYTES,
      })
    : null;
  const imageId = image?.blob.type.startsWith("image/")
    ? await ctx.storage.store(image.blob)
    : undefined;

  await ctx.runMutation(internal.system.recipes.completeImport, {
    recipeId,
    imageId,
    ...content,
  });
}

// Returns the body with the URL after redirects, or null when the request
// fails, times out, or the body is too large.
async function fetchWithLimit(
  url: string,
  options: { accept: string; maxBytes: number },
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: { ...REQUEST_HEADERS, Accept: options.accept },
      redirect: "follow",
      signal: controller.signal,
    });
    const declaredLength = Number(response.headers.get("content-length"));

    if (!response.ok || declaredLength > options.maxBytes) {
      return null;
    }

    const blob = await response.blob();

    return blob.size > options.maxBytes
      ? null
      : { blob, url: response.url || url };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
