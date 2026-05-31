import { useDroppable } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { GripVertical } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import { SortableTodoTaskItem } from "@/components/todo/SortableTodoTaskItem";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { TodoItem, TodoSection } from "@/types";

type SortableTodoSectionProps = {
  section: TodoSection;
  index: number;
  todos: TodoItem[];
  onToggleTodo: (todoId: TodoItem["_id"]) => void;
  onDeleteTodo: (todoId: TodoItem["_id"]) => void;
  onRenameSection: (
    sectionId: TodoSection["_id"],
    title: string,
  ) => Promise<void>;
};

export function SortableTodoSection({
  section,
  index,
  todos,
  onToggleTodo,
  onDeleteTodo,
  onRenameSection,
}: SortableTodoSectionProps) {
  const [draftTitle, setDraftTitle] = useState(section.title);
  const {
    ref: sectionRef,
    handleRef: sectionHandleRef,
    isDragging,
  } = useSortable({
    id: section._id,
    index,
    group: "sections",
    type: "section",
    data: {
      type: "section",
      sectionId: section._id,
    },
  });
  const { ref: dropRef } = useDroppable({
    id: `section-drop-${section._id}`,
    type: "section-drop",
    accept: "todo",
    data: {
      type: "section-drop",
      sectionId: section._id,
    },
  });

  const handleSubmit = async (event: React.SyntheticEvent) => {
    event.preventDefault();

    if (!draftTitle.trim() || draftTitle.trim() === section.title) {
      return;
    }

    try {
      await onRenameSection(section._id, draftTitle);
    } catch {
      // Do nothing
    }
  };

  return (
    <li
      ref={sectionRef}
      className={cn(
        "p-2",
        index === 0 ? "border-none" : "border-t border-border/80",
        isDragging && "relative z-20 shadow-lg shadow-background/25",
      )}
    >
      <AccordionItem value={section._id} className="border-none">
        <div className="my-2 flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Reorder section"
            className="mt-0.5 shrink-0 cursor-grab text-muted-foreground hover:text-foreground"
            ref={(element) => {
              sectionHandleRef(element);
            }}
          >
            <GripVertical className="size-4" />
          </Button>

          <div className="min-w-0 flex-1">
            <AccordionTrigger className="flex items-center min-w-0 gap-3 px-0 py-1 hover:no-underline focus-visible:border-transparent focus-visible:ring-0">
              <Input
                aria-label="Section title"
                value={draftTitle}
                onChange={(event) => {
                  setDraftTitle(event.target.value);
                }}
                onBlur={handleSubmit}
                onClick={(e) => {
                  e.stopPropagation();
                }}
                className="font-semibold min-w-0 flex-1 border-none outline-none focus-visible:ring-0 bg-transparent! text-[16px]! p-0!"
              />
            </AccordionTrigger>
          </div>
        </div>

        <AccordionContent className="pb-0">
          <div ref={dropRef} className={cn("rounded-xl bg-background/35")}>
            {todos.length === 0 ? (
              <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                No todos in this section yet.
              </div>
            ) : (
              <motion.ul layout className="flex flex-col gap-2">
                <AnimatePresence initial={false}>
                  {todos.map((todo, todoIndex) => (
                    <SortableTodoTaskItem
                      key={todo._id}
                      index={todoIndex}
                      group={section._id}
                      isReorderEnabled={!todo.isCompleted}
                      todo={todo}
                      onToggleTodo={onToggleTodo}
                      onDeleteTodo={onDeleteTodo}
                    />
                  ))}
                </AnimatePresence>
              </motion.ul>
            )}
          </div>
        </AccordionContent>
      </AccordionItem>
    </li>
  );
}
