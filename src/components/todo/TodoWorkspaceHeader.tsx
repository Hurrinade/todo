import { SignOutButton } from "@clerk/react";

import { TodoSidebarToggle } from "@/components/todo/TodoSidebarToggle";
import { Button } from "@/components/ui/button";

export function TodoWorkspaceHeader() {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border bg-card/80 p-4">
      <div className="flex min-w-0 items-center gap-3">
        <TodoSidebarToggle placement="header" />
      </div>

      <SignOutButton>
        <Button variant="outline">Log out</Button>
      </SignOutButton>
    </div>
  );
}
