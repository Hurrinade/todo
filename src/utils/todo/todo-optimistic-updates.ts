import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { OptimisticLocalStore } from "convex/browser";
import { insertAtTop } from "convex/react";
import type { FunctionArgs } from "convex/server";

import type { TodoItem, TodoListItem } from "@/types";

// Optimistic updates for todo mutations. Each one mirrors what the matching
// mutation in convex/mutations/todos.ts does, applied to whichever todo
// queries are currently loaded. Convex rolls them back if the mutation fails.

// Mirrors ORDER_STEP in convex/mutations/todos.ts.
const ORDER_STEP = 1024;
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
  const todo: TodoListItem = {
    _id: `${OPTIMISTIC_TODO_ID_PREFIX}${crypto.randomUUID()}` as Id<"todos">,
    _creationTime: now,
    listId,
    sectionId: undefined,
    title,
    isCompleted: false,
    completedAt: undefined,
    order: 0,
    updatedAt: now,
  };

  updateOpenTodos(localStore, listId, (todos) => [
    { ...todo, order: todos[0] ? todos[0].order - ORDER_STEP : 0 },
    ...todos,
  ]);

  const defaultSectionId = localStore
    .getQuery(api.queries.todoSections.list, { listId })
    ?.find((section) => section.isDefault)?._id;

  if (defaultSectionId) {
    updateSectionedTodos(localStore, listId, (todos) => {
      const orders = getBucketOrders(todos, defaultSectionId, false);

      return [
        ...todos,
        {
          ...todo,
          sectionId: defaultSectionId,
          order: orders.length > 0 ? Math.min(...orders) - 1 : 0,
        },
      ];
    });
  }

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

  // Regular lists keep open and completed todos in separate queries.
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
      const lastTodo = todos.at(-1);

      return [
        ...todos,
        { ...toggledTodo, order: lastTodo ? lastTodo.order + ORDER_STEP : 0 },
      ];
    });
  }

  // Sectioned lists move the todo to the end of its new bucket.
  updateSectionedTodos(localStore, todo.listId, (todos) => {
    const orders = getBucketOrders(todos, todo.sectionId, isCompleted);
    const order = Math.max(-1, ...orders) + 1;

    return todos.map((currentTodo) =>
      currentTodo._id === todoId ? { ...toggledTodo, order } : currentTodo,
    );
  });

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
    const lowerOrder = nextTodos[insertIndex - 1]?.order;
    const upperOrder = nextTodos[insertIndex]?.order;
    const order =
      lowerOrder === undefined
        ? (upperOrder ?? ORDER_STEP) - ORDER_STEP
        : upperOrder === undefined
          ? lowerOrder + ORDER_STEP
          : (lowerOrder + upperOrder) / 2;

    nextTodos.splice(insertIndex, 0, { ...todo, order });

    return nextTodos;
  });
}

export function moveTodoOptimistically(
  localStore: OptimisticLocalStore,
  { todoId, targetSectionId, targetIndex }: TodoMutationArgs<"move">,
) {
  const todo = findLoadedTodo(localStore, todoId);
  const sourceSectionId = todo?.sectionId;

  if (!todo || !sourceSectionId) {
    return;
  }

  updateSectionedTodos(localStore, todo.listId, (todos) => {
    const getBucket = (sectionId: Id<"todoSections">) =>
      todos
        .filter(
          (currentTodo) =>
            currentTodo.sectionId === sectionId &&
            currentTodo.isCompleted === todo.isCompleted &&
            currentTodo._id !== todoId,
        )
        .sort(compareByOrder);
    const sourceTodos = getBucket(sourceSectionId);
    const targetTodos =
      sourceSectionId === targetSectionId
        ? sourceTodos
        : getBucket(targetSectionId);

    targetTodos.splice(
      Math.max(0, Math.min(targetIndex, targetTodos.length)),
      0,
      todo,
    );

    // Like the server, both buckets are renumbered from 0.
    const nextPositions = new Map([
      ...sourceTodos.map(
        ({ _id }, order) =>
          [_id, { sectionId: sourceSectionId, order }] as const,
      ),
      ...targetTodos.map(
        ({ _id }, order) =>
          [_id, { sectionId: targetSectionId, order }] as const,
      ),
    ]);

    return todos.map((currentTodo) => {
      const position = nextPositions.get(currentTodo._id);

      return position ? { ...currentTodo, ...position } : currentTodo;
    });
  });
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
      .getAllQueries(api.queries.todos.listSectioned)
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
  updateSectionedTodos(localStore, listId, update);
}

function updateOpenTodos(
  localStore: OptimisticLocalStore,
  listId: TodoListItem["listId"],
  update: UpdateTodos,
) {
  const todos = localStore.getQuery(api.queries.todos.listOpen, { listId });

  if (todos) {
    localStore.setQuery(api.queries.todos.listOpen, { listId }, update(todos));
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

/** Keeps the server sort: open todos first, then by order. */
function updateSectionedTodos(
  localStore: OptimisticLocalStore,
  listId: TodoListItem["listId"],
  update: UpdateTodos,
) {
  const todos = localStore.getQuery(api.queries.todos.listSectioned, {
    listId,
  });

  if (todos) {
    localStore.setQuery(
      api.queries.todos.listSectioned,
      { listId },
      [...update(todos)].sort(
        (firstTodo, secondTodo) =>
          Number(firstTodo.isCompleted) - Number(secondTodo.isCompleted) ||
          compareByOrder(firstTodo, secondTodo),
      ),
    );
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

function getBucketOrders(
  todos: TodoListItem[],
  sectionId: TodoListItem["sectionId"],
  isCompleted: boolean,
) {
  return todos
    .filter(
      (todo) =>
        todo.sectionId === sectionId && todo.isCompleted === isCompleted,
    )
    .map(({ order }) => order);
}

function compareByOrder(firstTodo: TodoListItem, secondTodo: TodoListItem) {
  return firstTodo.order - secondTodo.order;
}
