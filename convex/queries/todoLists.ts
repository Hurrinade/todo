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

    const listMetadata = await Promise.all(
      filteredTodoLists.map(async (todoList) => {
        const [openTodos, completedTodos, memberships] = await Promise.all([
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
          ctx.db
            .query("todoListUsers")
            .withIndex("by_list_id", (q) => q.eq("listId", todoList._id))
            .collect(),
        ]);
        const members = await Promise.all(
          memberships.map(async (membership) => {
            const memberUser = await ctx.db
              .query("users")
              .withIndex("by_clerk_id", (q) =>
                q.eq("clerkId", membership.userId),
              )
              .unique();

            return {
              userId: membership.userId,
              firstName: memberUser?.firstName,
              lastName: memberUser?.lastName,
            };
          }),
        );

        return {
          listId: todoList._id,
          openTodoCount: openTodos.length,
          completedTodoCount: completedTodos.length,
          members: members.sort(compareMembers),
        };
      }),
    );

    return filteredTodoLists
      .map((todoList) => {
        const metadata = listMetadata.find(
          (item) => item.listId === todoList._id,
        );

        return {
          ...todoList,
          openTodoCount: metadata?.openTodoCount ?? 0,
          completedTodoCount: metadata?.completedTodoCount ?? 0,
          members: metadata?.members ?? [],
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

function compareMembers(
  firstMember: {
    userId: string;
    firstName?: string;
    lastName?: string;
  },
  secondMember: {
    userId: string;
    firstName?: string;
    lastName?: string;
  },
) {
  const firstName = getMemberSortValue(firstMember);
  const secondName = getMemberSortValue(secondMember);

  if (firstName !== secondName) {
    return firstName.localeCompare(secondName);
  }

  return firstMember.userId.localeCompare(secondMember.userId);
}

function getMemberSortValue(member: {
  userId: string;
  firstName?: string;
  lastName?: string;
}) {
  return `${member.firstName ?? ""} ${member.lastName ?? ""}`
    .trim()
    .toLowerCase();
}
