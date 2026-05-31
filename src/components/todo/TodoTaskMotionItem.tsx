import { motion, type HTMLMotionProps, type Transition } from "motion/react";

import { cn } from "@/lib/utils";
import type { TodoItem } from "@/types";

type TodoTaskMotionItemProps = Omit<
  HTMLMotionProps<"li">,
  "layout" | "layoutId" | "transition"
> & {
  todoId: TodoItem["_id"];
};

const todoTaskLayoutTransition = {
  type: "spring",
  stiffness: 360,
  damping: 35,
  mass: 1,
} satisfies Transition;

export function TodoTaskMotionItem({
  todoId,
  className,
  children,
  ...props
}: TodoTaskMotionItemProps) {
  return (
    <motion.li
      layout="position"
      layoutId={`todo-task-${todoId}`}
      initial={false}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={todoTaskLayoutTransition}
      className={cn("relative z-20 rounded-lg", className)}
      {...props}
    >
      {children}
    </motion.li>
  );
}
