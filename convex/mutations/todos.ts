import { v } from "convex/values";

import { mutation } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { requireClerkUserId, requireListAccess } from "../shared/auth";
import {
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
    await requireListAccess(ctx, args.listId, userId);
    const list = await ctx.db.get(args.listId);

    if (!list) {
      throw new Error("Todo list was not found.");
    }

    const now = Date.now();
    const defaultSectionId =
      list.kind === "sectioned"
        ? await getDefaultSectionId(ctx, args.listId)
        : undefined;
    const nextOrder = await getNextCreateOrder(
      ctx,
      args.listId,
      defaultSectionId,
      false,
    );
    const todoId = await ctx.db.insert("todos", {
      listId: args.listId,
      sectionId: defaultSectionId,
      title: normalizeTodoTitleContent(args.title),
      isCompleted: false,
      order: nextOrder,
      updatedAt: now,
    });

    await ctx.db.patch(args.listId, {
      updatedAt: now,
    });

    return todoId;
  },
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

    await requireListAccess(ctx, todo.listId, userId);
    const list = await ctx.db.get(todo.listId);

    if (!list) {
      throw new Error("Todo list was not found.");
    }

    const now = Date.now();
    const nextIsCompleted = !todo.isCompleted;
    const nextOrder = await getNextOrderForTodoState(
      ctx,
      list,
      todo.sectionId,
      nextIsCompleted,
      todo._id,
    );

    await ctx.db.patch(args.todoId, {
      isCompleted: nextIsCompleted,
      completedAt: nextIsCompleted ? now : undefined,
      order: nextOrder,
      updatedAt: now,
    });
    await ctx.db.patch(todo.listId, {
      updatedAt: now,
    });
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

export const remove = mutation({
  args: {
    todoId: v.id("todos"),
  },
  handler: async (ctx, args) => {
    const userId = await requireClerkUserId(ctx);
    const todo = await ctx.db.get(args.todoId);

    if (!todo) {
      throw new Error("Todo was not found.");
    }

    await requireListAccess(ctx, todo.listId, userId);

    await ctx.db.delete(args.todoId);
    await ctx.db.patch(todo.listId, {
      updatedAt: Date.now(),
    });
  },
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
    const todo = await ctx.db.get(args.todoId);

    if (!todo) {
      throw new Error("Todo was not found.");
    }

    await requireListAccess(ctx, todo.listId, userId);

    const [list, targetSection] = await Promise.all([
      ctx.db.get(todo.listId),
      ctx.db.get(args.targetSectionId),
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
        args.targetSectionId,
        todo.isCompleted,
        sourceSectionId === args.targetSectionId ? todo._id : undefined,
      ),
    ]);

    const nextTargetTodos = [...targetTodos];
    const clampedIndex = Math.max(
      0,
      Math.min(args.targetIndex, nextTargetTodos.length),
    );

    nextTargetTodos.splice(clampedIndex, 0, todo);

    if (sourceSectionId === args.targetSectionId) {
      await patchTodoOrders(ctx, nextTargetTodos, sourceSectionId, now);
    } else {
      await Promise.all([
        patchTodoOrders(ctx, sourceTodos, sourceSectionId, now),
        patchTodoOrders(
          ctx,
          nextTargetTodos.map((targetTodo) =>
            targetTodo._id === todo._id
              ? { ...targetTodo, sectionId: args.targetSectionId }
              : targetTodo,
          ),
          args.targetSectionId,
          now,
        ),
      ]);
    }

    await ctx.db.patch(todo.listId, {
      updatedAt: now,
    });
  },
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
    await ctx.db.patch(args.listId, {
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

    await ctx.db.patch(args.listId, {
      updatedAt: now,
    });
  },
});

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
