import { motion, type HTMLMotionProps, type Transition } from "motion/react";

import { cn } from "@/lib/utils";
import type { TodoListItem } from "@/types";

type TodoTaskMotionItemProps = Omit<
  HTMLMotionProps<"li">,
  "layout" | "layoutId" | "transition"
> & {
  todoId: TodoListItem["_id"];
};

const todoTaskLayoutTransition = {
  type: "tween",
  duration: 0.2,
  ease: "easeOut",
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
      transition={todoTaskLayoutTransition}
      className={cn("relative z-50 rounded-lg", className)}
      {...props}
    >
      {children}
    </motion.li>
  );
}
