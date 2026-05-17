import { query } from "../_generated/server";
import { requireClerkUserId } from "../shared/auth";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireClerkUserId(ctx);
    const todoListUsers = await ctx.db
      .query("todoListUsers")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .collect();

    const todoLists = await Promise.all(
      todoListUsers.map((todoListUser) => ctx.db.get(todoListUser.listId)),
    );

    const filteredTodoLists = todoLists.filter(
      (todoList): todoList is NonNullable<typeof todoList> => Boolean(todoList),
    );

    const todoCounts = await Promise.all(
      filteredTodoLists.map(async (todoList) => {
        const [openTodos, completedTodos] = await Promise.all([
          ctx.db
            .query("todos")
            .withIndex("by_list_id_and_completed", (q) =>
              q.eq("listId", todoList._id).eq("isCompleted", false),
            )
            .collect(),
          ctx.db
            .query("todos")
            .withIndex("by_list_id_and_completed", (q) =>
              q.eq("listId", todoList._id).eq("isCompleted", true),
            )
            .collect(),
        ]);

        return {
          listId: todoList._id,
          openTodoCount: openTodos.length,
          completedTodoCount: completedTodos.length,
        };
      }),
    );

    return filteredTodoLists
      .map((todoList) => {
        const counts = todoCounts.find(
          (count) => count.listId === todoList._id,
        );

        return {
          ...todoList,
          openTodoCount: counts?.openTodoCount ?? 0,
          completedTodoCount: counts?.completedTodoCount ?? 0,
        };
      })
      .sort(compareTodoLists);
  },
});

function compareTodoLists(
  firstList: {
    _creationTime: number;
    order?: number;
    updatedAt: number;
  },
  secondList: {
    _creationTime: number;
    order?: number;
    updatedAt: number;
  },
) {
  if (firstList.order !== undefined && secondList.order !== undefined) {
    return firstList.order - secondList.order;
  }

  if (firstList.order !== undefined) {
    return -1;
  }

  if (secondList.order !== undefined) {
    return 1;
  }

  if (firstList.updatedAt !== secondList.updatedAt) {
    return secondList.updatedAt - firstList.updatedAt;
  }

  return secondList._creationTime - firstList._creationTime;
}
