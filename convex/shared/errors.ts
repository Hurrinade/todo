import { ConvexError } from "convex/values";

import type { Id, TableNames } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

export type AppErrorCode =
  | "unauthenticated"
  | "forbidden"
  | "not_found"
  | "invalid_input"
  | "conflict";

/**
 * Errors a person can hit in the web app. The app shows its own translation
 * for each key; MCP and anything without a key show the English `message`.
 */
export const APP_ERROR_KEYS = [
  "signedOut",
  "ownerOnly",
  "inviteInvalid",
  "inviteExpired",
  "todoNotFound",
  "listNotFound",
  "sectionNotFound",
  "listOrderStale",
  "sectionOrderStale",
  "titleRequired",
  "titleTooLong",
  "descriptionTooLong",
  "recipeNotFound",
  "recipeExists",
  "recipeWrongList",
  "recipeLinkInvalid",
  "recipeInputEmpty",
  "recipeNameTooLong",
  "recipeServingsTooLong",
  "recipeLineTooLong",
  "recipeTooManyLines",
  "recipeMinutesInvalid",
  "recipeImporting",
] as const;

export type AppErrorKey = (typeof APP_ERROR_KEYS)[number];

export type AppErrorData = {
  code: AppErrorCode;
  message: string;
  key?: AppErrorKey;
};

// Throw for failures a person or agent should read. MCP shows `message` as
// is; the web app translates `key` when there is one. Any other error is
// reported as a generic failure.
export function appError(
  code: AppErrorCode,
  message: string,
  key?: AppErrorKey,
) {
  return new ConvexError<AppErrorData>({ code, message, key });
}

const NOT_FOUND_ERRORS = {
  todos: { message: "Todo was not found.", key: "todoNotFound" },
  todoLists: { message: "Todo list was not found.", key: "listNotFound" },
  todoSections: { message: "Section was not found.", key: "sectionNotFound" },
} as const satisfies Partial<
  Record<TableNames, { message: string; key: AppErrorKey }>
>;

type NotFoundTable = keyof typeof NOT_FOUND_ERRORS;

export function notFoundError(tableName: NotFoundTable) {
  const { message, key } = NOT_FOUND_ERRORS[tableName];

  return appError("not_found", message, key);
}

// Turns an untrusted ID string into a typed ID. A malformed ID fails the same
// way as a missing document, so callers never see argument validation errors.
export function requireId<TableName extends NotFoundTable>(
  ctx: Pick<QueryCtx, "db">,
  tableName: TableName,
  id: string,
): Id<TableName> {
  const normalizedId = ctx.db.normalizeId(tableName, id);

  if (normalizedId === null) {
    throw notFoundError(tableName);
  }

  return normalizedId;
}

// Returns the translation key of an `appError`, or null when it has none.
export function getAppErrorKey(error: unknown): AppErrorKey | null {
  if (!(error instanceof ConvexError)) {
    return null;
  }

  const data: unknown = error.data;
  const key =
    typeof data === "object" && data !== null && "key" in data
      ? data.key
      : null;

  return APP_ERROR_KEYS.find((appErrorKey) => appErrorKey === key) ?? null;
}

// Returns the user-facing message of an `appError`, or null for anything else.
export function getAppErrorMessage(error: unknown) {
  if (!(error instanceof ConvexError)) {
    return null;
  }

  const data: unknown = error.data;

  return typeof data === "object" &&
    data !== null &&
    "message" in data &&
    typeof data.message === "string"
    ? data.message
    : null;
}
