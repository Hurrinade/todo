import { SignOutButton } from "@clerk/react";

import { TodoSidebarToggle } from "@/components/todo/TodoSidebarToggle";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/common/ThemeToggle";

export function TodoWorkspaceHeader() {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border bg-card/80 p-4">
      <div className="flex min-w-0 items-center gap-3">
        <TodoSidebarToggle placement="header" />
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle />

        <SignOutButton>
          <Button variant="outline" className="h-9">
            Log out
          </Button>
        </SignOutButton>
      </div>
    </div>
  );
}
