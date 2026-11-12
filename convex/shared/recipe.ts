import { v, type Infer } from "convex/values";

import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { appError } from "./errors";

export const MAX_RECIPE_URL_LENGTH = 2048;
const MAX_RECIPE_NAME_LENGTH = 240;
const MAX_RECIPE_LINES = 200;
const MAX_RECIPE_LINE_LENGTH = 2000;

export const recipeStatusValidator = v.union(
  v.literal("importing"),
  v.literal("ready"),
  v.literal("failed"),
);

// The page content copied into a recipe. Shared by the schema and the import.
export const recipeContentFields = {
  totalMinutes: v.optional(v.number()),
  servings: v.optional(v.string()),
  ingredients: v.array(v.string()),
  steps: v.array(v.string()),
};

const recipeContentValidator = v.object(recipeContentFields);

export type ParsedRecipe = Infer<typeof recipeContentValidator> & {
  name: string;
  imageUrl?: string;
};

// Accepts a pasted link and returns it as an absolute HTTP(S) URL.
export function normalizeRecipeUrl(input: string) {
  const trimmed = input.trim();
  const withProtocol = /^[a-z][a-z\d+.-]*:/i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  const url = URL.canParse(withProtocol) ? new URL(withProtocol) : null;

  if (
    !url ||
    (url.protocol !== "http:" && url.protocol !== "https:") ||
    !url.hostname.includes(".") ||
    url.href.length > MAX_RECIPE_URL_LENGTH
  ) {
    throw appError("invalid_input", "Paste a full recipe link.");
  }

  return url.href;
}

// "www.bbcgoodfood.com" -> "bbcgoodfood.com", used until the real name loads.
export function getRecipeHost(url: string) {
  return new URL(url).hostname.replace(/^www\./, "");
}

// The recipe fields the web app shows, with a URL for the stored image.
export async function getRecipeView(
  ctx: Pick<QueryCtx, "storage">,
  recipe: Doc<"recipes">,
) {
  return {
    _id: recipe._id,
    status: recipe.status,
    errorMessage: recipe.errorMessage,
    sourceUrl: recipe.sourceUrl,
    imageUrl: recipe.imageId ? await ctx.storage.getUrl(recipe.imageId) : null,
    totalMinutes: recipe.totalMinutes,
    servings: recipe.servings,
    ingredients: recipe.ingredients,
    steps: recipe.steps,
    importedAt: recipe.importedAt,
  };
}

/**
 * Reads the schema.org Recipe that most recipe sites embed as JSON-LD for
 * search engines. Returns null when the page has none.
 */
export function parseRecipeFromHtml(
  html: string,
  pageUrl: string,
): ParsedRecipe | null {
  const scripts = html.matchAll(
    /<script\b[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi,
  );

  for (const [, json] of scripts) {
    const node = findRecipeNode(parseJson(json));
    const recipe = node && toParsedRecipe(node, pageUrl);

    if (recipe) {
      return {
        ...recipe,
        imageUrl: recipe.imageUrl ?? getMetaImageUrl(html, pageUrl),
      };
    }
  }

  return null;
}

// The page title, so a recipe that failed to import still has a readable name.
export function parsePageTitle(html: string) {
  const title =
    getMetaContent(html, "og:title") ??
    html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];

  return title ? truncate(cleanText(title), MAX_RECIPE_NAME_LENGTH) : undefined;
}

type JsonRecord = Record<string, unknown>;

function toParsedRecipe(node: JsonRecord, pageUrl: string) {
  const name = getText(node.name);
  const ingredients = limitLines(
    toArray(node.recipeIngredient ?? node.ingredients).flatMap(toLines),
  );
  const steps = limitLines(getInstructionLines(node.recipeInstructions));

  if (!name || (ingredients.length === 0 && steps.length === 0)) {
    return null;
  }

  return {
    name: truncate(name, MAX_RECIPE_NAME_LENGTH),
    imageUrl: getImageUrl(node.image, pageUrl),
    totalMinutes:
      parseDurationMinutes(node.totalTime) ??
      sumMinutes(
        parseDurationMinutes(node.prepTime),
        parseDurationMinutes(node.cookTime),
      ),
    servings: getServings(node.recipeYield),
    ingredients,
    steps,
  } satisfies ParsedRecipe;
}

// Recipes sit at the top level, in an array, or in a "@graph".
function findRecipeNode(value: unknown, depth = 0): JsonRecord | null {
  if (depth > 4) {
    return null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const recipe = findRecipeNode(item, depth + 1);

      if (recipe) {
        return recipe;
      }
    }

    return null;
  }

  if (!isRecord(value)) {
    return null;
  }

  if (toArray(value["@type"]).includes("Recipe")) {
    return value;
  }

  return (
    findRecipeNode(value["@graph"], depth + 1) ??
    findRecipeNode(value.mainEntity, depth + 1)
  );
}

// Instructions come as one text block, a list of strings, HowToSteps, or
// HowToSections that group HowToSteps.
function getInstructionLines(value: unknown): string[] {
  if (typeof value === "string") {
    return toLines(value);
  }

  if (Array.isArray(value)) {
    return value.flatMap(getInstructionLines);
  }

  if (!isRecord(value)) {
    return [];
  }

  if (value.itemListElement !== undefined) {
    return getInstructionLines(value.itemListElement);
  }

  return toLines(value.text ?? value.name);
}

function getImageUrl(value: unknown, pageUrl: string): string | undefined {
  const image = toArray(value)[0];
  const url = isRecord(image) ? image.url : image;

  return typeof url === "string" ? toHttpUrl(url, pageUrl) : undefined;
}

function getMetaImageUrl(html: string, pageUrl: string) {
  const url = getMetaContent(html, "og:image");

  return url ? toHttpUrl(url, pageUrl) : undefined;
}

function getMetaContent(html: string, property: string) {
  for (const [tag] of html.matchAll(/<meta\b[^>]*>/gi)) {
    const name = tag.match(/\b(?:property|name)\s*=\s*["']([^"']+)["']/i)?.[1];

    if (name?.toLowerCase() === property) {
      return tag.match(/\bcontent\s*=\s*["']([^"']*)["']/i)?.[1];
    }
  }

  return undefined;
}

// Some sites send ["4", "4 servings"]; prefer the descriptive value.
function getServings(value: unknown) {
  const yields = toArray(value)
    .map((item) => (typeof item === "number" ? String(item) : getText(item)))
    .filter((item): item is string => Boolean(item));

  return yields.find((item) => !/^\d+$/.test(item)) ?? yields[0];
}

// ISO 8601 durations such as "PT1H30M" or "P0DT45M".
function parseDurationMinutes(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const match = value
    .trim()
    .match(
      /^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i,
    );

  if (!match) {
    return undefined;
  }

  const [, days = "0", hours = "0", minutes = "0", seconds = "0"] = match;
  const total = Math.round(
    Number(days) * 1440 +
      Number(hours) * 60 +
      Number(minutes) +
      Number(seconds) / 60,
  );

  return total > 0 ? total : undefined;
}

function sumMinutes(...values: (number | undefined)[]) {
  const total = values.reduce<number>((sum, value) => sum + (value ?? 0), 0);

  return total > 0 ? total : undefined;
}

function toLines(value: unknown) {
  if (typeof value !== "string") {
    return [];
  }

  return value
    .replace(/<(?:br|\/p|\/li|\/div)\b[^>]*>/gi, "\n")
    .split(/\n+/)
    .map(cleanText)
    .filter(Boolean);
}

function getText(value: unknown) {
  return typeof value === "string" ? cleanText(value) || undefined : undefined;
}

// Drops markup and decodes entities, which sites often leave in JSON-LD text.
function cleanText(value: string) {
  return decodeEntities(value.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  frac12: "½",
  frac14: "¼",
  frac34: "¾",
  deg: "°",
  ndash: "-",
  mdash: "-",
  hellip: "...",
  rsquo: "'",
  lsquo: "'",
  rdquo: '"',
  ldquo: '"',
};

function decodeEntities(value: string) {
  return value.replace(
    /&(#\d+|#x[\da-f]+|[a-z]+\d*);/gi,
    (entity, code: string) => {
      if (code.startsWith("#")) {
        const point =
          code[1].toLowerCase() === "x"
            ? Number.parseInt(code.slice(2), 16)
            : Number.parseInt(code.slice(1), 10);

        return point > 0 && point <= 0x10ffff
          ? String.fromCodePoint(point)
          : entity;
      }

      return NAMED_ENTITIES[code.toLowerCase()] ?? entity;
    },
  );
}

function toHttpUrl(value: string, pageUrl: string) {
  const url = URL.canParse(value, pageUrl) ? new URL(value, pageUrl) : null;

  return url && (url.protocol === "http:" || url.protocol === "https:")
    ? url.href
    : undefined;
}

function limitLines(lines: string[]) {
  return lines
    .slice(0, MAX_RECIPE_LINES)
    .map((line) => truncate(line, MAX_RECIPE_LINE_LENGTH));
}

function truncate(value: string, length: number) {
  return value.length > length ? `${value.slice(0, length - 3)}...` : value;
}

function toArray(value: unknown): unknown[] {
  if (value === undefined || value === null) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function parseJson(json: string): unknown {
  try {
    return JSON.parse(json.trim());
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
