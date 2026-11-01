import { RotateCcw } from "lucide-react";
import { Component } from "react";

import { Button } from "@/components/ui/button";
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
      <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-lg border border-border bg-card/55 px-4 text-center">
        <p className="text-sm text-muted-foreground">
          Completed todos could not be loaded.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            this.setState({ hasError: false });
          }}
        >
          <RotateCcw className="size-4" />
          Retry
        </Button>
      </div>
    );
  }
}
