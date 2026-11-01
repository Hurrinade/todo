import { v } from "convex/values";

import type { Doc, Id } from "../_generated/dataModel";
import { internalQuery, type QueryCtx } from "../_generated/server";
import { requireListAccess } from "../shared/auth";
import { appError, notFoundError, requireId } from "../shared/errors";
import { getTodoRecord } from "../shared/todoRecord";

export const listTodoLists = internalQuery({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const lists = await getAccessibleLists(ctx, args.userId);

    return Promise.all(
      lists.map(async (list) => {
        const sections = await ctx.db
          .query("todoSections")
          .withIndex("by_list_id", (q) => q.eq("listId", list._id))
          .collect();

        return { list, sections: sections.sort(compareSections) };
      }),
    );
  },
});

// Pages through one list at a time. The cursor is "<listId>:<list cursor>", so an
// unscoped call walks every accessible list that has matching todos.
export const listTodos = internalQuery({
  args: {
    userId: v.string(),
    listId: v.optional(v.string()),
    sectionId: v.optional(v.string()),
    completed: v.boolean(),
    limit: v.number(),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const sectionId =
      args.sectionId === undefined
        ? undefined
        : requireId(ctx, "todoSections", args.sectionId);
    const lists = await resolveTodoLists(ctx, {
      userId: args.userId,
      listId:
        args.listId === undefined
          ? undefined
          : requireId(ctx, "todoLists", args.listId),
      sectionId,
    });
    // Skip lists without matching todos so pages are rarely empty.
    const hasMatchingTodos = (list: Doc<"todoLists">) =>
      (args.completed ? list.completedTodoCount : list.openTodoCount) > 0;
    const position = args.cursor
      ? parseListTodosCursor(lists, args.cursor)
      : { listIndex: lists.findIndex(hasMatchingTodos), cursor: null };
    const list = lists[position.listIndex];

    if (!list) {
      return { records: [], nextCursor: null };
    }

    const todos = ctx.db.query("todos");
    const [page, sections] = await Promise.all([
      (sectionId === undefined
        ? todos.withIndex("by_list_id_completed_and_order", (q) =>
            q.eq("listId", list._id).eq("isCompleted", args.completed),
          )
        : todos.withIndex("by_section_id_completed_and_order", (q) =>
            q.eq("sectionId", sectionId).eq("isCompleted", args.completed),
          )
      ).paginate({ numItems: args.limit, cursor: position.cursor }),
      ctx.db
        .query("todoSections")
        .withIndex("by_list_id", (q) => q.eq("listId", list._id))
        .collect(),
    ]);
    const sectionsById = new Map(
      sections.map((section) => [section._id, section]),
    );
    const nextList = lists.slice(position.listIndex + 1).find(hasMatchingTodos);

    return {
      records: page.page.map((todo) => ({
        todo,
        list,
        section: todo.sectionId
          ? (sectionsById.get(todo.sectionId) ?? null)
          : null,
      })),
      nextCursor: !page.isDone
        ? `${list._id}:${page.continueCursor}`
        : nextList
          ? `${nextList._id}:`
          : null,
    };
  },
});

export const getTodo = internalQuery({
  args: {
    userId: v.string(),
    todoId: v.string(),
  },
  handler: async (ctx, args) => {
    const record = await getTodoRecord(
      ctx,
      requireId(ctx, "todos", args.todoId),
    );

    await requireListAccess(ctx, record.todo.listId, args.userId);

    return record;
  },
});

async function getAccessibleLists(ctx: QueryCtx, userId: string) {
  const memberships = await ctx.db
    .query("todoListUsers")
    .withIndex("by_user_id", (q) => q.eq("userId", userId))
    .collect();
  const lists = await Promise.all(
    memberships.map((membership) => ctx.db.get(membership.listId)),
  );

  return lists
    .filter((list): list is Doc<"todoLists"> => list !== null)
    .sort(compareLists);
}

async function resolveTodoLists(
  ctx: QueryCtx,
  args: {
    userId: string;
    listId?: Id<"todoLists">;
    sectionId?: Id<"todoSections">;
  },
) {
  if (args.sectionId) {
    const section = await ctx.db.get(args.sectionId);

    if (!section || (args.listId && section.listId !== args.listId)) {
      throw notFoundError("todoSections");
    }

    return [await getAccessibleList(ctx, section.listId, args.userId)];
  }

  if (args.listId) {
    return [await getAccessibleList(ctx, args.listId, args.userId)];
  }

  return getAccessibleLists(ctx, args.userId);
}

async function getAccessibleList(
  ctx: QueryCtx,
  listId: Id<"todoLists">,
  userId: string,
) {
  await requireListAccess(ctx, listId, userId);
  const list = await ctx.db.get(listId);

  if (!list) {
    throw notFoundError("todoLists");
  }

  return list;
}

function parseListTodosCursor(lists: Doc<"todoLists">[], cursor: string) {
  const separatorIndex = cursor.indexOf(":");
  const listIndex = lists.findIndex(
    (list) => list._id === cursor.slice(0, separatorIndex),
  );

  if (separatorIndex === -1 || listIndex === -1) {
    throw appError("invalid_input", "The cursor is invalid or expired.");
  }

  return { listIndex, cursor: cursor.slice(separatorIndex + 1) || null };
}

function compareLists(first: Doc<"todoLists">, second: Doc<"todoLists">) {
  if (first.order !== undefined && second.order !== undefined) {
    return first.order - second.order;
  }

  if (first.order !== undefined) {
    return -1;
  }

  if (second.order !== undefined) {
    return 1;
  }

  if (first.updatedAt !== second.updatedAt) {
    return second.updatedAt - first.updatedAt;
  }

  return second._creationTime - first._creationTime;
}

function compareSections(
  first: Doc<"todoSections">,
  second: Doc<"todoSections">,
) {
  if (first.order !== undefined && second.order !== undefined) {
    return first.order - second.order;
  }

  if (first.order !== undefined) {
    return -1;
  }

  if (second.order !== undefined) {
    return 1;
  }

  return first._creationTime - second._creationTime;
}
