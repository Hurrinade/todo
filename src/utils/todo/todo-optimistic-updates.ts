import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { getOrderBetween, ORDER_STEP } from "@convex/shared/todoOrder";
import type { OptimisticLocalStore } from "convex/browser";
import { insertAtTop } from "convex/react";
import type { FunctionArgs } from "convex/server";

import type { TodoItem, TodoListItem } from "@/types";

// Optimistic updates for todo mutations. Each one mirrors what the matching
// mutation in convex/mutations/todos.ts does, applied to whichever todo
// queries are currently loaded. Convex rolls them back if the mutation fails.
// Both list kinds share listOpen and listCompleted; sectioned todos carry a
// sectionId, and ordering uses the same sparse helpers as the server.

const OPTIMISTIC_TODO_ID_PREFIX = "optimistic:";

type TodoMutationArgs<Name extends keyof typeof api.mutations.todos> =
  FunctionArgs<(typeof api.mutations.todos)[Name]>;

type UpdateTodos = (todos: TodoListItem[]) => TodoListItem[];

/** True for a todo created optimistically that the server hasn't confirmed yet. */
export function isOptimisticTodo(todo: Pick<TodoListItem, "_id">) {
  return todo._id.startsWith(OPTIMISTIC_TODO_ID_PREFIX);
}

export function createTodoOptimistically(
  localStore: OptimisticLocalStore,
  { listId, title }: TodoMutationArgs<"create">,
) {
  const now = Date.now();
  // Sectioned lists add to the top of their default section.
  const sectionId = localStore
    .getQuery(api.queries.todoSections.list, { listId })
    ?.find((section) => section.isDefault)?._id;

  updateOpenTodos(localStore, listId, (todos) => {
    const firstTodo = todos.find((current) => current.sectionId === sectionId);

    return [
      ...todos,
      {
        _id: `${OPTIMISTIC_TODO_ID_PREFIX}${crypto.randomUUID()}` as Id<"todos">,
        _creationTime: now,
        listId,
        sectionId,
        title,
        isCompleted: false,
        completedAt: undefined,
        order: firstTodo ? firstTodo.order - ORDER_STEP : 0,
        updatedAt: now,
      },
    ];
  });

  updateListStats(localStore, listId, { open: 1 });
}

export function toggleTodoOptimistically(
  localStore: OptimisticLocalStore,
  { todoId }: TodoMutationArgs<"toggle">,
) {
  const todo = findLoadedTodo(localStore, todoId);

  if (!todo) {
    return;
  }

  const now = Date.now();
  const isCompleted = !todo.isCompleted;
  const completedAt = isCompleted ? now : undefined;
  const toggledTodo = { ...todo, isCompleted, completedAt, updatedAt: now };

  // Completing moves the todo to the top of the newest-first completed pages.
  // Unchecking puts it last among the open todos of its section or list.
  if (isCompleted) {
    updateOpenTodos(localStore, todo.listId, (todos) =>
      todos.filter(({ _id }) => _id !== todoId),
    );
    insertAtTop({
      paginatedQuery: api.queries.todos.listCompleted,
      argsToMatch: { listId: todo.listId },
      localQueryStore: localStore,
      item: toggledTodo,
    });
  } else {
    updateCompletedTodos(localStore, todo.listId, (todos) =>
      todos.filter(({ _id }) => _id !== todoId),
    );
    updateOpenTodos(localStore, todo.listId, (todos) => {
      const lastTodo = todos.findLast(
        ({ sectionId }) => sectionId === todo.sectionId,
      );

      return [
        ...todos,
        { ...toggledTodo, order: lastTodo ? lastTodo.order + ORDER_STEP : 0 },
      ];
    });
  }

  updateTodoDetail(localStore, todoId, { isCompleted, completedAt });
  updateListStats(
    localStore,
    todo.listId,
    isCompleted ? { open: -1, completed: 1 } : { open: 1, completed: -1 },
  );
}

export function removeTodoOptimistically(
  localStore: OptimisticLocalStore,
  { todoId }: TodoMutationArgs<"remove">,
) {
  const todo = findLoadedTodo(localStore, todoId);

  if (!todo) {
    return;
  }

  updateListTodos(localStore, todo.listId, (todos) =>
    todos.filter(({ _id }) => _id !== todoId),
  );
  updateListStats(
    localStore,
    todo.listId,
    todo.isCompleted ? { completed: -1 } : { open: -1 },
  );
}

export function renameTodoOptimistically(
  localStore: OptimisticLocalStore,
  { todoId, title }: TodoMutationArgs<"rename">,
) {
  const todo = findLoadedTodo(localStore, todoId);

  if (todo) {
    updateListTodos(localStore, todo.listId, (todos) =>
      todos.map((currentTodo) =>
        currentTodo._id === todoId ? { ...currentTodo, title } : currentTodo,
      ),
    );
  }

  updateTodoDetail(localStore, todoId, { title });
}

export function repositionTodoOptimistically(
  localStore: OptimisticLocalStore,
  { todoId, anchorTodoId, placement }: TodoMutationArgs<"reposition">,
) {
  const todo = findLoadedTodo(localStore, todoId);

  if (!todo) {
    return;
  }

  updateOpenTodos(localStore, todo.listId, (todos) => {
    const nextTodos = todos.filter(({ _id }) => _id !== todoId);
    const anchorIndex = nextTodos.findIndex(({ _id }) => _id === anchorTodoId);

    if (anchorIndex === -1) {
      return todos;
    }

    const insertIndex = placement === "before" ? anchorIndex : anchorIndex + 1;

    nextTodos.splice(insertIndex, 0, {
      ...todo,
      order: getSlotOrder(nextTodos, insertIndex),
    });

    return nextTodos;
  });
}

export function moveTodoOptimistically(
  localStore: OptimisticLocalStore,
  { todoId, targetSectionId, targetIndex }: TodoMutationArgs<"move">,
) {
  const todo = findLoadedTodo(localStore, todoId);

  // The UI only moves open todos, which all live in listOpen.
  if (!todo || todo.isCompleted) {
    return;
  }

  updateOpenTodos(localStore, todo.listId, (todos) => {
    const targetTodos = todos.filter(
      ({ _id, sectionId }) => sectionId === targetSectionId && _id !== todoId,
    );
    const slot = Math.max(0, Math.min(targetIndex, targetTodos.length));
    const movedTodo = {
      ...todo,
      sectionId: targetSectionId,
      order: getSlotOrder(targetTodos, slot),
    };

    return todos.map((current) =>
      current._id === todoId ? movedTodo : current,
    );
  });
}

/**
 * Order for a todo inserted at `slot` of an ordered bucket. When the gap has
 * run out the server rebalances; the lower order keeps the local sort right.
 */
function getSlotOrder(todos: TodoListItem[], slot: number) {
  const lowerOrder = todos[slot - 1]?.order;

  return getOrderBetween(lowerOrder, todos[slot]?.order) ?? lowerOrder ?? 0;
}

function findLoadedTodo(
  localStore: OptimisticLocalStore,
  todoId: TodoListItem["_id"],
) {
  const loadedTodoLists = [
    ...localStore
      .getAllQueries(api.queries.todos.listOpen)
      .map(({ value }) => value),
    ...localStore
      .getAllQueries(api.queries.todos.listCompleted)
      .map(({ value }) => value?.page),
  ];

  for (const todos of loadedTodoLists) {
    const todo = todos?.find(({ _id }) => _id === todoId);

    if (todo) {
      return todo;
    }
  }

  return null;
}

/** Applies the same update to every loaded todo query of a list. */
function updateListTodos(
  localStore: OptimisticLocalStore,
  listId: TodoListItem["listId"],
  update: UpdateTodos,
) {
  updateOpenTodos(localStore, listId, update);
  updateCompletedTodos(localStore, listId, update);
}

/** Keeps the server sort: ascending by order. */
function updateOpenTodos(
  localStore: OptimisticLocalStore,
  listId: TodoListItem["listId"],
  update: UpdateTodos,
) {
  const todos = localStore.getQuery(api.queries.todos.listOpen, { listId });

  if (todos) {
    localStore.setQuery(
      api.queries.todos.listOpen,
      { listId },
      update(todos).toSorted(
        (firstTodo, secondTodo) => firstTodo.order - secondTodo.order,
      ),
    );
  }
}

function updateCompletedTodos(
  localStore: OptimisticLocalStore,
  listId: TodoListItem["listId"],
  update: UpdateTodos,
) {
  for (const { args, value } of localStore.getAllQueries(
    api.queries.todos.listCompleted,
  )) {
    if (value && args.listId === listId) {
      localStore.setQuery(api.queries.todos.listCompleted, args, {
        ...value,
        page: update(value.page),
      });
    }
  }
}

function updateTodoDetail(
  localStore: OptimisticLocalStore,
  todoId: TodoListItem["_id"],
  patch: Partial<TodoItem>,
) {
  const detail = localStore.getQuery(api.queries.todos.get, { todoId });

  if (detail) {
    localStore.setQuery(
      api.queries.todos.get,
      { todoId },
      { ...detail, todo: { ...detail.todo, ...patch } },
    );
  }
}

function updateListStats(
  localStore: OptimisticLocalStore,
  listId: TodoListItem["listId"],
  delta: { open?: number; completed?: number },
) {
  const lists = localStore.getQuery(api.queries.todoLists.list, {});

  if (!lists) {
    return;
  }

  localStore.setQuery(
    api.queries.todoLists.list,
    {},
    lists.map((list) =>
      list._id === listId
        ? {
            ...list,
            openTodoCount: Math.max(0, list.openTodoCount + (delta.open ?? 0)),
            completedTodoCount: Math.max(
              0,
              list.completedTodoCount + (delta.completed ?? 0),
            ),
          }
        : list,
    ),
  );
}
