import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import type { TodoWorkspaceSplitViewProps } from "@/types";

// The detail panel opens at its widest so recipes and notes have room.
const DETAIL_PANEL_MAX_SIZE = "55%";

// The panel group always renders, and only the detail panel comes and goes.
// That keeps the list mounted (and its scroll position intact) when a todo
// opens or closes.
export function TodoWorkspaceSplitView({
  children,
  detailPanel,
}: TodoWorkspaceSplitViewProps) {
  return (
    <div className="relative min-h-0 flex-1 overflow-hidden">
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel id="todo-workspace" minSize="15rem" className="min-w-0">
          {children}
        </ResizablePanel>

        {detailPanel ? (
          <>
            <ResizableHandle
              id="todo-detail-resize-handle"
              withHandle
              aria-label="Resize todo detail panel"
              className="z-30"
            />

            <ResizablePanel
              id="todo-detail"
              defaultSize={DETAIL_PANEL_MAX_SIZE}
              minSize="16rem"
              maxSize={DETAIL_PANEL_MAX_SIZE}
              className="min-w-0"
            >
              <div className="h-full min-w-0 overflow-hidden bg-background">
                {detailPanel}
              </div>
            </ResizablePanel>
          </>
        ) : null}
      </ResizablePanelGroup>
    </div>
  );
}
