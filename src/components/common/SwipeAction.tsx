import {
  animate,
  motion,
  useDragControls,
  useMotionValue,
  type PanInfo,
} from "motion/react";
import {
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { cn } from "@/lib/utils";
import type { SwipeActionProps } from "@/types";

const DEFAULT_ACTION_WIDTH = 56;
const CLICK_SUPPRESSION_DISTANCE = 6;
const actionWidthClassNames: Record<number, string> = {
  48: "w-12",
  56: "w-14",
  64: "w-16",
  80: "w-20",
  96: "w-24",
  112: "w-28",
};

export function SwipeAction({
  children,
  actions,
  actionWidth = DEFAULT_ACTION_WIDTH,
  actionSide = "right",
  className,
  contentClassName,
  actionsClassName,
  ariaLabel,
}: SwipeActionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const shouldSuppressClickRef = useRef(false);
  const dragControls = useDragControls();
  const direction = actionSide === "right" ? -1 : 1;
  const openX = actionWidth * direction;
  const x = useMotionValue(0);
  const dragConstraints =
    actionSide === "right"
      ? { left: -actionWidth, right: 0 }
      : { left: 0, right: actionWidth };
  const actionWidthClass =
    actionWidthClassNames[actionWidth] ??
    actionWidthClassNames[DEFAULT_ACTION_WIDTH];
  const transition = {
    type: "spring" as const,
    stiffness: 520,
    damping: 40,
    mass: 0.8,
  };

  const animateTo = (nextX: number, nextIsOpen: boolean) => {
    setIsOpen(nextIsOpen);
    void animate(x, nextX, transition);
  };

  const handleDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    const startX = isOpen ? openX : 0;
    const currentX = startX + info.offset.x;
    const shouldOpen = currentX * direction >= actionWidth / 2;

    if (Math.abs(info.offset.x) > CLICK_SUPPRESSION_DISTANCE) {
      shouldSuppressClickRef.current = true;
    }

    animateTo(shouldOpen ? openX : 0, shouldOpen);
  };

  const handleClickCapture = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!shouldSuppressClickRef.current) {
      return;
    }

    shouldSuppressClickRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  };

  const handlePointerDownCapture = () => {
    shouldSuppressClickRef.current = false;
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || isSwipeIgnored(event.target)) {
      return;
    }

    dragControls.start(event);
  };

  return (
    <div
      aria-label={ariaLabel}
      className={cn(
        "relative w-full min-w-0 max-w-full overflow-hidden rounded-r-lg",
        className,
      )}
      data-state={isOpen ? "open" : "closed"}
    >
      <div
        aria-hidden={!isOpen}
        className={cn(
          "pointer-events-none absolute inset-y-0 flex items-stretch data-[state=open]:pointer-events-auto rounded-r-lg",
          actionSide === "right" ? "right-0" : "left-0",
          actionWidthClass,
          actionsClassName,
        )}
        data-state={isOpen ? "open" : "closed"}
        inert={isOpen ? undefined : true}
        onClick={() => {
          animateTo(0, false);
        }}
      >
        {actions}
      </div>

      <motion.div
        className={cn(
          "relative z-10 w-full min-w-0 max-w-full touch-pan-y rounded-l-lg bg-card",
          contentClassName,
        )}
        drag="x"
        dragControls={dragControls}
        dragConstraints={dragConstraints}
        dragElastic={0.08}
        dragListener={false}
        dragMomentum={false}
        onPointerDownCapture={handlePointerDownCapture}
        onPointerDown={handlePointerDown}
        onClickCapture={handleClickCapture}
        onDragEnd={handleDragEnd}
        style={{ x }}
        whileDrag={{ scale: 0.995 }}
      >
        {children}
      </motion.div>
    </div>
  );
}

function isSwipeIgnored(target: EventTarget | null) {
  return (
    target instanceof Element && Boolean(target.closest("[data-swipe-ignore]"))
  );
}
