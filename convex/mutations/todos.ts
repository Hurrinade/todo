import { v } from "convex/values";

import { internalMutation, mutation } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { requireAppUserId, requireListAccess } from "../shared/auth";
import { updateTodoListStats } from "../shared/todoListStats";
import {
  getFirstOrder,
  getLastOrder,
  getNeighboursAtIndex,
  getNeighboursOfAnchor,
  ORDER_STEP,
  placeTodo,
} from "../shared/todoOrder";
import {
  createTodoNoteContent,
  createTodoTitleContent,
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

    return createTodoForUser(ctx, userId, args);
  },
});

export const createForUser = internalMutation({
  args: {
    userId: v.string(),
    listId: v.id("todoLists"),
    sectionId: v.optional(v.id("todoSections")),
    title: v.string(),
    description: v.optional(v.string()),
  },
  handler: (ctx, args) =>
    createTodoForUser(ctx, args.userId, {
      listId: args.listId,
      sectionId: args.sectionId,
      title: createTodoTitleContent(args.title),
      description: args.description
        ? createTodoNoteContent(args.description)
        : undefined,
    }),
});

export const toggle = mutation({
  args: {
    todoId: v.id("todos"),
  },
  handler: async (ctx, args) => {
    const userId = await requireAppUserId(ctx);
    const todo = await ctx.db.get(args.todoId);

    if (!todo) {
      throw new Error("Todo was not found.");
    }

    await setTodoCompletedForUser(ctx, userId, todo, !todo.isCompleted);
  },
});

export const setCompletedForUser = internalMutation({
  args: {
    userId: v.string(),
    todoId: v.id("todos"),
    completed: v.boolean(),
  },
  handler: async (ctx, args) => {
    const todo = await ctx.db.get(args.todoId);

    if (!todo) {
      throw new Error("Todo was not found.");
    }

    await setTodoCompletedForUser(ctx, args.userId, todo, args.completed);

    return { todoId: todo._id, completed: args.completed };
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
      throw new Error("Todo was not found.");
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
      throw new Error("Todo was not found.");
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
    todoId: v.id("todos"),
    title: v.optional(v.string()),
    description: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const todo = await ctx.db.get(args.todoId);

    if (!todo) {
      throw new Error("Todo was not found.");
    }

    await requireListAccess(ctx, todo.listId, args.userId);

    if (args.title === undefined && args.description === undefined) {
      throw new Error("Provide a title or description to update.");
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

    await ctx.db.patch(args.todoId, {
      title,
      description,
      updatedAt: Date.now(),
    });

    return args.todoId;
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
    todoId: v.id("todos"),
  },
  handler: (ctx, args) => removeTodoForUser(ctx, args.userId, args.todoId),
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
      throw new Error("Todo was not found.");
    }

    await requireListAccess(ctx, todo.listId, userId);

    if (todo._id === anchorTodo._id) {
      throw new Error("A todo cannot be positioned relative to itself.");
    }

    if (todo.listId !== anchorTodo.listId) {
      throw new Error("Todos must belong to the same list.");
    }

    const list = await ctx.db.get(todo.listId);

    if (!list || list.kind !== "regular") {
      throw new Error("Repositioning is only available in regular lists.");
    }

    if (todo.isCompleted || anchorTodo.isCompleted) {
      throw new Error("Only open todos can be repositioned.");
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
    todoId: v.id("todos"),
    targetSectionId: v.id("todoSections"),
  },
  handler: (ctx, args) =>
    moveTodoForUser(ctx, args.userId, args.todoId, args.targetSectionId),
});

export const clearCompleted = mutation({
  args: {
    listId: v.id("todoLists"),
  },
  handler: async (ctx, args) => {
    const userId = await requireAppUserId(ctx);
    await requireListAccess(ctx, args.listId, userId);

    const completedTodos = await ctx.db
      .query("todos")
      .withIndex("by_list_id_completed_and_order", (q) =>
        q.eq("listId", args.listId).eq("isCompleted", true),
      )
      .collect();

    if (completedTodos.length === 0) {
      return;
    }

    await Promise.all(completedTodos.map((todo) => ctx.db.delete(todo._id)));
    await updateTodoListStats(ctx, args.listId, {
      completedTodoCount: 0,
      updatedAt: Date.now(),
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

    const completedTodos = await ctx.db
      .query("todos")
      .withIndex("by_list_id_completed_and_order", (q) =>
        q.eq("listId", args.listId).eq("isCompleted", true),
      )
      .collect();

    if (completedTodos.length === 0) {
      return;
    }

    const now = Date.now();
    // Completed todos keep their relative order after the open todos of their
    // bucket. Each bucket costs one read for its last open order.
    const nextOrders = new Map<Id<"todoSections"> | undefined, number>();

    for (const todo of completedTodos) {
      const order =
        nextOrders.get(todo.sectionId) ??
        (await getLastOrder(ctx, { ...todo, isCompleted: false }));

      nextOrders.set(todo.sectionId, order + ORDER_STEP);
      await ctx.db.patch(todo._id, {
        isCompleted: false,
        completedAt: undefined,
        order,
        updatedAt: now,
      });
    }

    await updateTodoListStats(ctx, args.listId, {
      openTodoDelta: completedTodos.length,
      completedTodoCount: 0,
      updatedAt: now,
    });
  },
});

async function createTodoForUser(
  ctx: MutationCtx,
  userId: string,
  args: {
    listId: Id<"todoLists">;
    sectionId?: Id<"todoSections">;
    title: Doc<"todos">["title"];
    description?: Doc<"todos">["description"];
  },
) {
  await requireListAccess(ctx, args.listId, userId);
  const list = await ctx.db.get(args.listId);

  if (!list) {
    throw new Error("Todo list was not found.");
  }

  let sectionId = args.sectionId;

  if (list.kind === "regular") {
    if (sectionId) {
      throw new Error("Regular lists cannot contain sections.");
    }
  } else if (sectionId) {
    const section = await ctx.db.get(sectionId);

    if (!section || section.listId !== args.listId) {
      throw new Error("Target section was not found.");
    }
  } else {
    sectionId = await getDefaultSectionId(ctx, args.listId);
  }

  const now = Date.now();
  const todoId = await ctx.db.insert("todos", {
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

  await updateTodoListStats(ctx, args.listId, {
    openTodoDelta: 1,
    updatedAt: now,
  });

  return todoId;
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
    throw new Error("Todo was not found.");
  }

  await requireListAccess(ctx, todo.listId, userId);

  await ctx.db.delete(todoId);
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
    throw new Error("Todo was not found.");
  }

  await requireListAccess(ctx, todo.listId, userId);

  const [list, targetSection] = await Promise.all([
    ctx.db.get(todo.listId),
    ctx.db.get(targetSectionId),
  ]);

  if (!list) {
    throw new Error("Todo list was not found.");
  }

  if (list.kind !== "sectioned") {
    throw new Error("Todo moves are only available in sectioned lists.");
  }

  if (!todo.sectionId) {
    throw new Error("Todo is missing its section.");
  }

  if (!targetSection || targetSection.listId !== todo.listId) {
    throw new Error("Target section was not found.");
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
    throw new Error("Default section was not found.");
  }

  return defaultSection._id;
}
