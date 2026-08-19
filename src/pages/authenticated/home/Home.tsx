import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { Suspense, useState } from "react";
import {
  Outlet,
  useLocation,
  useMatch,
  useNavigate,
} from "react-router";

import { TodoWorkspace } from "@/components/todo/TodoWorkspace";
import { Spinner } from "@/components/ui/spinner";
import { useIsMobile } from "@/hooks/use-mobile";
import type {
  TodoDetailRouteContext,
  TodoListSummary,
  TodoWorkspaceLocationState,
} from "@/types";

export default function Home() {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const detailMatch = useMatch("/home/todos/:todoId");
  const todoId = detailMatch?.params.todoId;
  const locationState = location.state as TodoWorkspaceLocationState | null;
  const [activeListId, setActiveListId] = useState<
    TodoListSummary["_id"] | null
  >(locationState?.selectedListId ?? null);
  const detail = useQuery(
    api.queries.todos.get,
    todoId ? { todoId: todoId as Id<"todos"> } : "skip",
  );
  const detailListId = detail?.todo.listId ?? null;
  const workspaceActiveListId = detailListId ?? activeListId;

  const closeDetail = () => {
    const selectedListId = detailListId ?? activeListId;

    setActiveListId(selectedListId);
    navigate("/home", {
      replace: true,
      state: selectedListId ? { selectedListId } : undefined,
    });
  };

  const handleActiveListIdChange = (
    nextActiveListId: TodoListSummary["_id"] | null,
  ) => {
    setActiveListId(nextActiveListId);

    if (todoId) {
      navigate("/home", {
        replace: true,
        state: nextActiveListId
          ? { selectedListId: nextActiveListId }
          : undefined,
      });
    }
  };

  const detailRoute = todoId ? (
    <Suspense fallback={<TodoDetailRouteLoading />}>
      <Outlet
        key={todoId}
        context={
          {
            detail,
            onClose: closeDetail,
            presentation: isMobile ? "page" : "panel",
          } satisfies TodoDetailRouteContext
        }
      />
    </Suspense>
  ) : null;

  if (isMobile && detailRoute) {
    return detailRoute;
  }

  return (
    <TodoWorkspace
      activeListId={workspaceActiveListId}
      detailPanel={detailRoute}
      onActiveListIdChange={handleActiveListIdChange}
    />
  );
}

function TodoDetailRouteLoading() {
  return (
    <div
      className="flex h-full min-h-40 w-full items-center justify-center bg-background"
      role="status"
      aria-label="Loading todo details"
    >
      <Spinner />
    </div>
  );
}
