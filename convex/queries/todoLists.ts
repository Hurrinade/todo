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
        const todos = await ctx.db
          .query("todos")
          .withIndex("by_list_id", (q) => q.eq("listId", todoList._id))
          .collect();

        return {
          listId: todoList._id,
          openTodoCount: todos.filter((todo) => !todo.isCompleted).length,
          completedTodoCount: todos.filter((todo) => todo.isCompleted).length,
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
      .sort(
        (firstList, secondList) => secondList.updatedAt - firstList.updatedAt,
      );
  },
});
