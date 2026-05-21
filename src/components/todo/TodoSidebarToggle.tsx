import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

type TodoSidebarTogglePlacement = "floating" | "sidebar";

type TodoSidebarToggleProps = {
  placement: TodoSidebarTogglePlacement;
  className?: string;
};

export function TodoSidebarToggle({
  placement,
  className,
}: TodoSidebarToggleProps) {
  const { isMobile, open, openMobile, toggleSidebar } = useSidebar();
  const isOpen = isMobile ? openMobile : open;
  const shouldShow = placement === "sidebar" ? isOpen : !isOpen;

  if (!shouldShow) {
    return null;
  }

  return (
    <Button
      type="button"
      variant={placement === "floating" ? "outline" : "ghost"}
      size={placement === "floating" ? "icon-sm" : "icon"}
      onClick={toggleSidebar}
      aria-label={
        isOpen ? "Close todo lists sidebar" : "Open todo lists sidebar"
      }
      className={cn(
        "text-muted-foreground hover:text-foreground",
        placement === "floating" &&
          "border-border bg-background/95 text-foreground shadow-sm backdrop-blur-sm",
        className,
      )}
    >
      <Menu />
    </Button>
  );
}
