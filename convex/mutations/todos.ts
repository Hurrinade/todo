import { v } from "convex/values";

import { internalMutation, mutation } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { requireAppUserId, requireListAccess } from "../shared/auth";
import { appError, notFoundError, requireId } from "../shared/errors";
import { getTodoRecord } from "../shared/todoRecord";
import { deleteRecipeForTodo } from "../system/recipes";
import { processCompletedTodos } from "../system/todoBatches";
import { updateTodoListStats } from "../shared/todoListStats";
import {
  getFirstOrder,
  getLastOrder,
  getNeighboursAtIndex,
  getNeighboursOfAnchor,
  placeTodo,
} from "../shared/todoOrder";
import {
  createTodoNoteContent,
  createTodoTitleContent,
  MAX_TODOS_PER_BATCH,
  normalizeTodoDescription,
  normalizeTodoTitleContent,
  todoNoteContentValidator,
  todoTitleContentValidator,
} from "../shared/todo";

export const create = mutation({
  args: {
    listId: v.id("todoLists"),
    title: todoTitleContentValidator,
  },
  handler: async (ctx, args) => {
    const userId = await requireAppUserId(ctx);
    const [todoId] = await createTodosForUser(ctx, userId, [args]);

    return todoId;
  },
});

// Creates plain-text todos for MCP in one transaction and returns them in input order.
export const createManyForUser = internalMutation({
  args: {
    userId: v.string(),
    todos: v.array(
      v.object({
        listId: v.string(),
        sectionId: v.optional(v.string()),
        title: v.string(),
        description: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    if (args.todos.length === 0 || args.todos.length > MAX_TODOS_PER_BATCH) {
      throw appError(
        "invalid_input",
        `Provide between 1 and ${MAX_TODOS_PER_BATCH} todos.`,
      );
    }

    const todoIds = await createTodosForUser(
      ctx,
      args.userId,
      args.todos.map((todo) => ({
        listId: requireId(ctx, "todoLists", todo.listId),
        sectionId:
          todo.sectionId === undefined
            ? undefined
            : requireId(ctx, "todoSections", todo.sectionId),
        title: createTodoTitleContent(todo.title),
        description:
          todo.description === undefined
            ? undefined
            : createTodoNoteContent(todo.description),
      })),
    );

    return Promise.all(todoIds.map((todoId) => getTodoRecord(ctx, todoId)));
  },
});

export const toggle = mutation({
  args: {
    todoId: v.id("todos"),
  },
  handler: async (ctx, args) => {
    const userId = await requireAppUserId(ctx);
    const todo = await ctx.db.get(args.todoId);

    if (!todo) {
      throw notFoundError("todos");
    }

    await setTodoCompletedForUser(ctx, userId, todo, !todo.isCompleted);
  },
});

export const setCompletedForUser = internalMutation({
  args: {
    userId: v.string(),
    todoId: v.string(),
    completed: v.boolean(),
  },
  handler: async (ctx, args) => {
    const todo = await ctx.db.get(requireId(ctx, "todos", args.todoId));

    if (!todo) {
      throw notFoundError("todos");
    }

    await setTodoCompletedForUser(ctx, args.userId, todo, args.completed);

    return getTodoRecord(ctx, todo._id);
  },
});

export const rename = mutation({
  args: {
    todoId: v.id("todos"),
    title: todoTitleContentValidator,
  },
  handler: async (ctx, args) => {
    const userId = await requireAppUserId(ctx);
    const todo = await ctx.db.get(args.todoId);

    if (!todo) {
      throw notFoundError("todos");
    }

    await requireListAccess(ctx, todo.listId, userId);

    await ctx.db.patch(args.todoId, {
      title: normalizeTodoTitleContent(args.title),
      updatedAt: Date.now(),
    });
  },
});

export const updateDescription = mutation({
  args: {
    todoId: v.id("todos"),
    description: v.optional(todoNoteContentValidator),
  },
  handler: async (ctx, args) => {
    const userId = await requireAppUserId(ctx);
    const todo = await ctx.db.get(args.todoId);

    if (!todo) {
      throw notFoundError("todos");
    }

    await requireListAccess(ctx, todo.listId, userId);

    await ctx.db.patch(args.todoId, {
      description: normalizeTodoDescription(args.description),
      updatedAt: Date.now(),
    });
  },
});

export const updateForUser = internalMutation({
  args: {
    userId: v.string(),
    todoId: v.string(),
    title: v.optional(v.string()),
    description: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const todo = await ctx.db.get(requireId(ctx, "todos", args.todoId));

    if (!todo) {
      throw notFoundError("todos");
    }

    await requireListAccess(ctx, todo.listId, args.userId);

    if (args.title === undefined && args.description === undefined) {
      throw appError(
        "invalid_input",
        "Provide a title or description to update.",
      );
    }

    const title =
      args.title === undefined
        ? todo.title
        : createTodoTitleContent(args.title);
    const description =
      args.description === undefined
        ? todo.description
        : args.description === null
          ? undefined
          : createTodoNoteContent(args.description);

    await ctx.db.patch(todo._id, {
      title,
      description,
      updatedAt: Date.now(),
    });

    return getTodoRecord(ctx, todo._id);
  },
});

export const remove = mutation({
  args: {
    todoId: v.id("todos"),
  },
  handler: async (ctx, args) => {
    const userId = await requireAppUserId(ctx);

    await removeTodoForUser(ctx, userId, args.todoId);
  },
});

export const removeForUser = internalMutation({
  args: {
    userId: v.string(),
    todoId: v.string(),
  },
  handler: (ctx, args) =>
    removeTodoForUser(ctx, args.userId, requireId(ctx, "todos", args.todoId)),
});

export const reposition = mutation({
  args: {
    todoId: v.id("todos"),
    anchorTodoId: v.id("todos"),
    placement: v.union(v.literal("before"), v.literal("after")),
  },
  handler: async (ctx, args) => {
    const userId = await requireAppUserId(ctx);
    const [todo, anchorTodo] = await Promise.all([
      ctx.db.get(args.todoId),
      ctx.db.get(args.anchorTodoId),
    ]);

    if (!todo || !anchorTodo) {
      throw notFoundError("todos");
    }

    await requireListAccess(ctx, todo.listId, userId);

    if (todo._id === anchorTodo._id) {
      throw appError(
        "invalid_input",
        "A todo cannot be positioned relative to itself.",
      );
    }

    if (todo.listId !== anchorTodo.listId) {
      throw appError("invalid_input", "Todos must belong to the same list.");
    }

    const list = await ctx.db.get(todo.listId);

    if (!list || list.kind !== "regular") {
      throw appError(
        "invalid_input",
        "Repositioning is only available in regular lists.",
      );
    }

    if (todo.isCompleted || anchorTodo.isCompleted) {
      throw appError("invalid_input", "Only open todos can be repositioned.");
    }

    const neighbours = await getNeighboursOfAnchor(
      ctx,
      anchorTodo,
      todo._id,
      args.placement,
    );

    await placeTodo(ctx, todo, anchorTodo, neighbours, Date.now());
  },
});

export const move = mutation({
  args: {
    todoId: v.id("todos"),
    targetSectionId: v.id("todoSections"),
    targetIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAppUserId(ctx);

    await moveTodoForUser(
      ctx,
      userId,
      args.todoId,
      args.targetSectionId,
      args.targetIndex,
    );
  },
});

export const moveToSectionEndForUser = internalMutation({
  args: {
    userId: v.string(),
    todoId: v.string(),
    targetSectionId: v.string(),
  },
  handler: async (ctx, args) => {
    const todoId = await moveTodoForUser(
      ctx,
      args.userId,
      requireId(ctx, "todos", args.todoId),
      requireId(ctx, "todoSections", args.targetSectionId),
    );

    return getTodoRecord(ctx, todoId);
  },
});

// Bulk actions below run their first batch here and schedule the rest, so the
// UI updates right away even for lists with a long completed history.
export const clearCompleted = mutation({
  args: {
    listId: v.id("todoLists"),
  },
  handler: async (ctx, args) => {
    const userId = await requireAppUserId(ctx);
    await requireListAccess(ctx, args.listId, userId);

    await processCompletedTodos(ctx, {
      listId: args.listId,
      action: "clear",
      completedBefore: Date.now(),
    });
  },
});

export const uncheckCompleted = mutation({
  args: {
    listId: v.id("todoLists"),
  },
  handler: async (ctx, args) => {
    const userId = await requireAppUserId(ctx);
    await requireListAccess(ctx, args.listId, userId);

    await processCompletedTodos(ctx, {
      listId: args.listId,
      action: "uncheck",
      completedBefore: Date.now(),
    });
  },
});

type CreateTodoInput = {
  listId: Id<"todoLists">;
  sectionId?: Id<"todoSections">;
  title: Doc<"todos">["title"];
  description?: Doc<"todos">["description"];
};

// Creates todos in one transaction, updating each list's stats once.
// Returns the new IDs in input order.
async function createTodosForUser(
  ctx: MutationCtx,
  userId: string,
  inputs: CreateTodoInput[],
) {
  const now = Date.now();
  const todoIds: Id<"todos">[] = [];
  const createdCounts = new Map<Id<"todoLists">, number>();

  // New todos go to the top of their section, so inserting in reverse keeps
  // the batch in input order.
  for (const input of inputs.toReversed()) {
    todoIds.unshift(await insertTodoForUser(ctx, userId, input, now));
    createdCounts.set(input.listId, (createdCounts.get(input.listId) ?? 0) + 1);
  }

  for (const [listId, count] of createdCounts) {
    await updateTodoListStats(ctx, listId, {
      openTodoDelta: count,
      updatedAt: now,
    });
  }

  return todoIds;
}

async function insertTodoForUser(
  ctx: MutationCtx,
  userId: string,
  args: CreateTodoInput,
  now: number,
) {
  await requireListAccess(ctx, args.listId, userId);
  const list = await ctx.db.get(args.listId);

  if (!list) {
    throw notFoundError("todoLists");
  }

  if (list.kind === "recipe") {
    throw appError(
      "invalid_input",
      "Recipe lists only take recipe links, added from the app.",
    );
  }

  let sectionId = args.sectionId;

  if (list.kind === "regular") {
    if (sectionId) {
      throw appError("invalid_input", "Regular lists cannot contain sections.");
    }
  } else if (sectionId) {
    const section = await ctx.db.get(sectionId);

    if (!section || section.listId !== args.listId) {
      throw notFoundError("todoSections");
    }
  } else {
    sectionId = await getDefaultSectionId(ctx, args.listId);
  }

  return ctx.db.insert("todos", {
    listId: args.listId,
    sectionId,
    title: normalizeTodoTitleContent(args.title),
    description: normalizeTodoDescription(args.description),
    isCompleted: false,
    order: await getFirstOrder(ctx, {
      listId: args.listId,
      sectionId,
      isCompleted: false,
    }),
    updatedAt: now,
  });
}

async function setTodoCompletedForUser(
  ctx: MutationCtx,
  userId: string,
  todo: Doc<"todos">,
  completed: boolean,
) {
  await requireListAccess(ctx, todo.listId, userId);

  if (todo.isCompleted === completed) {
    return;
  }

  // Completed todos are deleted after two weeks, so saved recipes never are.
  if ((await ctx.db.get(todo.listId))?.kind === "recipe") {
    throw appError("invalid_input", "Recipes cannot be completed.");
  }

  const now = Date.now();

  await ctx.db.patch(todo._id, {
    isCompleted: completed,
    completedAt: completed ? now : undefined,
    order: await getLastOrder(ctx, { ...todo, isCompleted: completed }),
    updatedAt: now,
  });
  await updateTodoListStats(ctx, todo.listId, {
    openTodoDelta: completed ? -1 : 1,
    completedTodoDelta: completed ? 1 : -1,
    updatedAt: now,
  });
}

async function removeTodoForUser(
  ctx: MutationCtx,
  userId: string,
  todoId: Id<"todos">,
) {
  const todo = await ctx.db.get(todoId);

  if (!todo) {
    throw notFoundError("todos");
  }

  await requireListAccess(ctx, todo.listId, userId);

  await ctx.db.delete(todoId);
  await deleteRecipeForTodo(ctx, todoId);
  await updateTodoListStats(ctx, todo.listId, {
    openTodoDelta: todo.isCompleted ? 0 : -1,
    completedTodoDelta: todo.isCompleted ? -1 : 0,
    updatedAt: Date.now(),
  });

  return todoId;
}

/** Moves a todo to slot `targetIndex` of its state bucket in the target section, or to its end. */
async function moveTodoForUser(
  ctx: MutationCtx,
  userId: string,
  todoId: Id<"todos">,
  targetSectionId: Id<"todoSections">,
  targetIndex?: number,
) {
  const todo = await ctx.db.get(todoId);

  if (!todo) {
    throw notFoundError("todos");
  }

  await requireListAccess(ctx, todo.listId, userId);

  const [list, targetSection] = await Promise.all([
    ctx.db.get(todo.listId),
    ctx.db.get(targetSectionId),
  ]);

  if (!list) {
    throw notFoundError("todoLists");
  }

  if (list.kind !== "sectioned") {
    throw appError(
      "invalid_input",
      "Todo moves are only available in sectioned lists.",
    );
  }

  if (!todo.sectionId) {
    throw appError("not_found", "Todo is missing its section.");
  }

  if (!targetSection || targetSection.listId !== todo.listId) {
    throw notFoundError("todoSections");
  }

  const bucket = { ...todo, sectionId: targetSectionId };
  const neighbours = await getNeighboursAtIndex(
    ctx,
    bucket,
    todo._id,
    targetIndex,
  );

  await placeTodo(ctx, todo, bucket, neighbours, Date.now());

  return todoId;
}

async function getDefaultSectionId(ctx: MutationCtx, listId: Id<"todoLists">) {
  const defaultSection = await ctx.db
    .query("todoSections")
    .withIndex("by_list_id_and_default", (q) =>
      q.eq("listId", listId).eq("isDefault", true),
    )
    .unique();

  if (!defaultSection) {
    throw appError("not_found", "Default section was not found.");
  }

  return defaultSection._id;
}
