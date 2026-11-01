import { ConvexError } from "convex/values";

import type { Id, TableNames } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

export type AppErrorCode =
  | "unauthenticated"
  | "forbidden"
  | "not_found"
  | "invalid_input"
  | "conflict";

export type AppErrorData = { code: AppErrorCode; message: string };

// Throw for failures a person or agent should read. The web app and MCP show
// `message` as is; any other error is reported as a generic failure.
export function appError(code: AppErrorCode, message: string) {
  return new ConvexError<AppErrorData>({ code, message });
}

const NOT_FOUND_MESSAGES = {
  todos: "Todo was not found.",
  todoLists: "Todo list was not found.",
  todoSections: "Section was not found.",
} as const satisfies Partial<Record<TableNames, string>>;

type NotFoundTable = keyof typeof NOT_FOUND_MESSAGES;

export function notFoundError(tableName: NotFoundTable) {
  return appError("not_found", NOT_FOUND_MESSAGES[tableName]);
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
