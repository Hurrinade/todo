import { useLocation } from "react-router";

import { TodoWorkspace } from "@/components/todo/TodoWorkspace";
import type { TodoWorkspaceLocationState } from "@/types";

export default function Home() {
  const location = useLocation();
  const locationState = location.state as TodoWorkspaceLocationState | null;

  return (
    <TodoWorkspace
      initialActiveListId={locationState?.selectedListId ?? null}
    />
  );
}
