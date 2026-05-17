import type { ReactNode } from "react";

export type SwipeActionProps = {
  children: ReactNode;
  actions: ReactNode;
  actionWidth?: number;
  actionSide?: "left" | "right";
  className?: string;
  contentClassName?: string;
  actionsClassName?: string;
  ariaLabel?: string;
};
