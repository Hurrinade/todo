import { RotateCcw } from "lucide-react";
import { Component } from "react";

import { Button } from "@/components/ui/button";
import { useT } from "@/hooks";
import type {
  TodoPaginationErrorBoundaryProps,
  TodoPaginationErrorBoundaryState,
} from "@/types";

/**
 * Catches completed-todo pagination errors. Retry remounts the children, so
 * their paginated query starts over.
 */
export class TodoPaginationErrorBoundary extends Component<
  TodoPaginationErrorBoundaryProps,
  TodoPaginationErrorBoundaryState
> {
  state: TodoPaginationErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <TodoPaginationErrorFallback
        onRetry={() => {
          this.setState({ hasError: false });
        }}
      />
    );
  }
}

// A function component so the text can use the app language.
function TodoPaginationErrorFallback({ onRetry }: { onRetry: () => void }) {
  const t = useT();

  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-lg border border-border bg-card/55 px-4 text-center">
      <p className="text-sm text-muted-foreground">
        {t.todos.completedLoadFailed}
      </p>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        <RotateCcw className="size-4" />
        {t.common.retry}
      </Button>
    </div>
  );
}
