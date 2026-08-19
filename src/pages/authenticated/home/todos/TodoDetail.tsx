import { api } from "@convex/_generated/api";
import { useMutation } from "convex/react";
import { useState } from "react";
import { useOutletContext } from "react-router";

import { TodoDetailView } from "@/components/todo/TodoDetailView";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useNetworkStore } from "@/stores";
import type {
  TodoDetailPresentation,
  TodoDetailRouteContext,
  TodoDetailUnavailableProps,
} from "@/types";
import { OFFLINE_ACTION_MESSAGE } from "@/utils";

export default function TodoDetail() {
  const { detail, onClose, presentation } =
    useOutletContext<TodoDetailRouteContext>();
  const isOnline = useNetworkStore((state) => state.isOnline);
  const renameTodo = useMutation(api.mutations.todos.rename);
  const updateDescription = useMutation(
    api.mutations.todos.updateDescription,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (detail === undefined) {
    return <TodoDetailLoading presentation={presentation} />;
  }

  if (detail == null) {
    return (
      <TodoDetailUnavailable
        message="Todo was not found."
        onClose={onClose}
        presentation={presentation}
      />
    );
  }

  return (
    <TodoDetailView
      detail={detail}
      errorMessage={errorMessage}
      onClose={onClose}
      onRenameTodo={async (title) => {
        setErrorMessage(null);

        if (!isOnline) {
          setErrorMessage(OFFLINE_ACTION_MESSAGE);
          throw new Error(OFFLINE_ACTION_MESSAGE);
        }

        try {
          await renameTodo({ todoId: detail.todo._id, title });
        } catch (error) {
          setErrorMessage(getErrorMessage(error));
          throw error;
        }
      }}
      onUpdateDescription={async (description) => {
        setErrorMessage(null);

        if (!isOnline) {
          setErrorMessage(OFFLINE_ACTION_MESSAGE);
          throw new Error(OFFLINE_ACTION_MESSAGE);
        }

        try {
          await updateDescription({ todoId: detail.todo._id, description });
        } catch (error) {
          setErrorMessage(getErrorMessage(error));
          throw error;
        }
      }}
      presentation={presentation}
    />
  );
}

function TodoDetailLoading({
  presentation,
}: {
  presentation: TodoDetailPresentation;
}) {
  const isPanel = presentation === "panel";

  return (
    <main className="h-full w-full overflow-y-auto bg-background text-foreground">
      <div
        className={cn(
          "flex min-h-full w-full flex-col gap-5 px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]",
          isPanel
            ? "md:px-5 md:pt-5 md:pb-5"
            : "mx-auto max-w-3xl sm:px-6 sm:pt-6 sm:pb-[calc(1.5rem+env(safe-area-inset-bottom))]",
        )}
      >
        <header className="flex min-w-0 items-center justify-between gap-2">
          <Skeleton className="size-9 rounded-md" />
          <Skeleton className="mr-auto h-4 w-24" />
          {isPanel ? <Skeleton className="size-9 rounded-md" /> : null}
        </header>

        <section className="flex min-w-0 flex-1 flex-col gap-8 px-1 py-2 sm:px-2">
          <div className="flex min-w-0 flex-col gap-3">
            <Skeleton className="h-8 w-full max-w-2xl" />
            <Skeleton className="h-8 w-3/4 max-w-xl" />
          </div>

          <div className="flex min-w-0 flex-col gap-2.5 border-t pt-5">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-40 w-full rounded-lg sm:h-48" />
          </div>
        </section>
      </div>
    </main>
  );
}

function TodoDetailUnavailable({
  message,
  onClose,
  presentation,
}: TodoDetailUnavailableProps) {
  return (
    <main className="flex h-full w-full items-center justify-center bg-background p-6 text-foreground">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Todo unavailable</h1>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
        <Button type="button" variant="secondary" onClick={onClose}>
          {presentation === "panel" ? "Close details" : "Back to workspace"}
        </Button>
      </div>
    </main>
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong.";
}
