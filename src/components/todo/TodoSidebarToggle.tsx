import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";

type TodoSidebarTogglePlacement = "header" | "sidebar";

type TodoSidebarToggleProps = {
  placement: TodoSidebarTogglePlacement;
};

export function TodoSidebarToggle({ placement }: TodoSidebarToggleProps) {
  const { isMobile, open, openMobile, toggleSidebar } = useSidebar();
  const isOpen = isMobile ? openMobile : open;
  const shouldShow = placement === "sidebar" ? isOpen : !isOpen;

  if (!shouldShow) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggleSidebar}
      aria-label={
        isOpen ? "Close todo lists sidebar" : "Open todo lists sidebar"
      }
      className="text-muted-foreground hover:text-foreground"
    >
      <Menu />
    </Button>
  );
}
