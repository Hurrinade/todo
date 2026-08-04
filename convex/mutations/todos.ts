import { v } from "convex/values";

import { internalMutation, mutation } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { requireClerkUserId, requireListAccess } from "../shared/auth";
import { updateTodoListStats } from "../shared/todoListStats";
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
    const userId = await requireClerkUserId(ctx);

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
    const userId = await requireClerkUserId(ctx);
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
    const userId = await requireClerkUserId(ctx);
    const todo = await ctx.db.get(args.todoId);

    if (!todo) {
      throw new Error("Todo was not found.");
    }

    await requireListAccess(ctx, todo.listId, userId);

    const now = Date.now();

    await ctx.db.patch(args.todoId, {
      title: normalizeTodoTitleContent(args.title),
      updatedAt: now,
    });
    await ctx.db.patch(todo.listId, {
      updatedAt: now,
    });
  },
});

export const updateDescription = mutation({
  args: {
    todoId: v.id("todos"),
    description: v.optional(todoNoteContentValidator),
  },
  handler: async (ctx, args) => {
    const userId = await requireClerkUserId(ctx);
    const todo = await ctx.db.get(args.todoId);

    if (!todo) {
      throw new Error("Todo was not found.");
    }

    await requireListAccess(ctx, todo.listId, userId);

    const now = Date.now();
    const description = normalizeTodoDescription(args.description);

    await ctx.db.patch(args.todoId, {
      description,
      updatedAt: now,
    });
    await ctx.db.patch(todo.listId, {
      updatedAt: now,
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

    const now = Date.now();
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
      updatedAt: now,
    });
    await ctx.db.patch(todo.listId, { updatedAt: now });

    return args.todoId;
  },
});

export const remove = mutation({
  args: {
    todoId: v.id("todos"),
  },
  handler: async (ctx, args) => {
    const userId = await requireClerkUserId(ctx);

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

export const reorder = mutation({
  args: {
    listId: v.id("todoLists"),
    todoIds: v.array(v.id("todos")),
  },
  handler: async (ctx, args) => {
    const userId = await requireClerkUserId(ctx);
    await requireListAccess(ctx, args.listId, userId);

    const todos = await ctx.db
      .query("todos")
      .withIndex("by_list_id", (q) => q.eq("listId", args.listId))
      .collect();

    if (todos.length !== args.todoIds.length) {
      throw new Error("Todo order is out of date.");
    }

    const todoIds = new Set(todos.map((todo) => todo._id));

    for (const todoId of args.todoIds) {
      if (!todoIds.has(todoId)) {
        throw new Error("Todo order contains an invalid item.");
      }
    }

    const now = Date.now();

    await Promise.all(
      args.todoIds.map((todoId, index) =>
        ctx.db.patch(todoId, {
          order: index,
          updatedAt: now,
        }),
      ),
    );
    await ctx.db.patch(args.listId, {
      updatedAt: now,
    });
  },
});

export const move = mutation({
  args: {
    todoId: v.id("todos"),
    targetSectionId: v.id("todoSections"),
    targetIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireClerkUserId(ctx);

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
    moveTodoForUser(
      ctx,
      args.userId,
      args.todoId,
      args.targetSectionId,
      Number.MAX_SAFE_INTEGER,
    ),
});

export const clearCompleted = mutation({
  args: {
    listId: v.id("todoLists"),
  },
  handler: async (ctx, args) => {
    const userId = await requireClerkUserId(ctx);
    await requireListAccess(ctx, args.listId, userId);

    const completedTodos = await ctx.db
      .query("todos")
      .withIndex("by_list_id_and_completed", (q) =>
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
    const userId = await requireClerkUserId(ctx);
    await requireListAccess(ctx, args.listId, userId);
    const list = await ctx.db.get(args.listId);

    if (!list) {
      throw new Error("Todo list was not found.");
    }

    const [openTodos, completedTodos] = await Promise.all([
      ctx.db
        .query("todos")
        .withIndex("by_list_id_and_completed", (q) =>
          q.eq("listId", args.listId).eq("isCompleted", false),
        )
        .collect(),
      ctx.db
        .query("todos")
        .withIndex("by_list_id_and_completed", (q) =>
          q.eq("listId", args.listId).eq("isCompleted", true),
        )
        .collect(),
    ]);

    if (completedTodos.length === 0) {
      return;
    }

    const now = Date.now();

    if (list.kind === "sectioned") {
      const sectionIds = new Set(
        completedTodos.flatMap((todo) =>
          todo.sectionId ? [todo.sectionId] : [],
        ),
      );

      for (const sectionId of sectionIds) {
        const sectionOpenTodos = openTodos
          .filter((todo) => todo.sectionId === sectionId)
          .sort(compareTodosByOrder);
        const sectionCompletedTodos = completedTodos
          .filter((todo) => todo.sectionId === sectionId)
          .sort(compareTodosByOrder);
        const nextOpenOrderStart = getMaxTodoOrder(sectionOpenTodos) + 1;

        await Promise.all(
          sectionCompletedTodos.map((todo, index) =>
            ctx.db.patch(todo._id, {
              isCompleted: false,
              completedAt: undefined,
              order: nextOpenOrderStart + index,
              updatedAt: now,
            }),
          ),
        );
      }
    } else {
      const nextOpenOrderStart = getMaxTodoOrder(openTodos) + 1;
      const sortedCompletedTodos = [...completedTodos].sort(
        compareTodosByOrder,
      );

      await Promise.all(
        sortedCompletedTodos.map((todo, index) =>
          ctx.db.patch(todo._id, {
            isCompleted: false,
            completedAt: undefined,
            order: nextOpenOrderStart + index,
            updatedAt: now,
          }),
        ),
      );
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
  const nextOrder = await getNextCreateOrder(
    ctx,
    args.listId,
    sectionId,
    false,
  );
  const todoId = await ctx.db.insert("todos", {
    listId: args.listId,
    sectionId,
    title: normalizeTodoTitleContent(args.title),
    description: normalizeTodoDescription(args.description),
    isCompleted: false,
    order: nextOrder,
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

  const list = await ctx.db.get(todo.listId);

  if (!list) {
    throw new Error("Todo list was not found.");
  }

  const now = Date.now();
  const nextOrder = await getNextOrderForTodoState(
    ctx,
    list,
    todo.sectionId,
    completed,
    todo._id,
  );

  await ctx.db.patch(todo._id, {
    isCompleted: completed,
    completedAt: completed ? now : undefined,
    order: nextOrder,
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

async function moveTodoForUser(
  ctx: MutationCtx,
  userId: string,
  todoId: Id<"todos">,
  targetSectionId: Id<"todoSections">,
  targetIndex: number,
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

  const now = Date.now();
  const sourceSectionId = todo.sectionId;
  const [sourceTodos, targetTodos] = await Promise.all([
    getOrderedSectionTodosByState(
      ctx,
      sourceSectionId,
      todo.isCompleted,
      todo._id,
    ),
    getOrderedSectionTodosByState(
      ctx,
      targetSectionId,
      todo.isCompleted,
      sourceSectionId === targetSectionId ? todo._id : undefined,
    ),
  ]);

  const nextTargetTodos = [...targetTodos];
  const clampedIndex = Math.max(
    0,
    Math.min(targetIndex, nextTargetTodos.length),
  );

  nextTargetTodos.splice(clampedIndex, 0, todo);

  if (sourceSectionId === targetSectionId) {
    await patchTodoOrders(ctx, nextTargetTodos, sourceSectionId, now);
  } else {
    await Promise.all([
      patchTodoOrders(ctx, sourceTodos, sourceSectionId, now),
      patchTodoOrders(
        ctx,
        nextTargetTodos.map((targetTodo) =>
          targetTodo._id === todo._id
            ? { ...targetTodo, sectionId: targetSectionId }
            : targetTodo,
        ),
        targetSectionId,
        now,
      ),
    ]);
  }

  await ctx.db.patch(todo.listId, { updatedAt: now });

  return todoId;
}

async function getNextOrderForTodoState(
  ctx: MutationCtx,
  list: { _id: Id<"todoLists">; kind: "regular" | "sectioned" },
  sectionId: Id<"todoSections"> | undefined,
  isCompleted: boolean,
  excludedTodoId: Id<"todos">,
) {
  const todos =
    list.kind === "sectioned" && sectionId
      ? await getOrderedSectionTodosByState(
          ctx,
          sectionId,
          isCompleted,
          excludedTodoId,
        )
      : await getOrderedListTodosByState(
          ctx,
          list._id,
          isCompleted,
          excludedTodoId,
        );

  return getMaxTodoOrder(todos) + 1;
}

async function getNextCreateOrder(
  ctx: MutationCtx,
  listId: Id<"todoLists">,
  sectionId: Id<"todoSections"> | undefined,
  isCompleted: boolean,
) {
  if (sectionId) {
    const todos = await getOrderedSectionTodosByState(
      ctx,
      sectionId,
      isCompleted,
    );
    const orderedTodos = todos.filter((todo) => todo.order !== undefined);

    return orderedTodos.length > 0
      ? Math.min(...orderedTodos.map((todo) => todo.order!)) - 1
      : 0;
  }

  const todos = await ctx.db
    .query("todos")
    .withIndex("by_list_id", (q) => q.eq("listId", listId))
    .collect();
  const orderedTodos = todos.filter((todo) => todo.order !== undefined);

  return orderedTodos.length > 0
    ? Math.min(...orderedTodos.map((todo) => todo.order!)) - 1
    : 0;
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

async function getOrderedListTodosByState(
  ctx: MutationCtx,
  listId: Id<"todoLists">,
  isCompleted: boolean,
  excludedTodoId?: Id<"todos">,
) {
  const todos = await ctx.db
    .query("todos")
    .withIndex("by_list_id_and_completed", (q) =>
      q.eq("listId", listId).eq("isCompleted", isCompleted),
    )
    .collect();

  return todos
    .filter((todo) => todo._id !== excludedTodoId)
    .sort(compareTodosByOrder);
}

async function getOrderedSectionTodosByState(
  ctx: MutationCtx,
  sectionId: Id<"todoSections">,
  isCompleted: boolean,
  excludedTodoId?: Id<"todos">,
) {
  const todos = await ctx.db
    .query("todos")
    .withIndex("by_section_id_and_completed", (q) =>
      q.eq("sectionId", sectionId).eq("isCompleted", isCompleted),
    )
    .collect();

  return todos
    .filter((todo) => todo._id !== excludedTodoId)
    .sort(compareTodosByOrder);
}

async function patchTodoOrders(
  ctx: MutationCtx,
  todos: Array<{
    _id: Id<"todos">;
    sectionId?: Id<"todoSections">;
  }>,
  sectionId: Id<"todoSections">,
  now: number,
) {
  await Promise.all(
    todos.map((todo, index) =>
      ctx.db.patch(todo._id, {
        sectionId,
        order: index,
        updatedAt: now,
      }),
    ),
  );
}

function getMaxTodoOrder(
  todos: Array<{
    _creationTime: number;
    order?: number;
  }>,
) {
  if (todos.length === 0) {
    return -1;
  }

  const sortedTodos = [...todos].sort(compareTodosByOrder);
  return sortedTodos.reduce((maxOrder, todo, index) => {
    return Math.max(maxOrder, todo.order ?? index);
  }, -1);
}

function compareTodosByOrder(
  firstTodo: {
    _creationTime: number;
    order?: number;
  },
  secondTodo: {
    _creationTime: number;
    order?: number;
  },
) {
  if (firstTodo.order !== undefined && secondTodo.order !== undefined) {
    return firstTodo.order - secondTodo.order;
  }

  if (firstTodo.order !== undefined) {
    return -1;
  }

  if (secondTodo.order !== undefined) {
    return 1;
  }

  return secondTodo._creationTime - firstTodo._creationTime;
}
