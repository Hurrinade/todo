import type { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { notFoundError } from "./errors";

// Loads a todo with its list and section, the shape MCP tools format.
// Callers check list access themselves.
export async function getTodoRecord(
  ctx: Pick<QueryCtx, "db">,
  todoId: Id<"todos">,
) {
  const todo = await ctx.db.get(todoId);

  if (!todo) {
    throw notFoundError("todos");
  }

  const [list, section] = await Promise.all([
    ctx.db.get(todo.listId),
    todo.sectionId ? ctx.db.get(todo.sectionId) : null,
  ]);

  if (!list) {
    throw notFoundError("todoLists");
  }

  return { todo, list, section };
}

export type TodoRecord = Awaited<ReturnType<typeof getTodoRecord>>;
