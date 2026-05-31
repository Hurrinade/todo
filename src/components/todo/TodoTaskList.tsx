import { DragDropProvider } from "@dnd-kit/react";
import { isSortable } from "@dnd-kit/react/sortable";
import { ClipboardList } from "lucide-react";
import { LayoutGroup, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { TodoEmptyState } from "@/components/todo/TodoEmptyState";
import { SortableTodoTaskItem } from "@/components/todo/SortableTodoTaskItem";
import { TodoTaskItem } from "@/components/todo/TodoTaskItem";
import { TodoTaskMotionItem } from "@/components/todo/TodoTaskMotionItem";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { TodoItem } from "@/types";

type TodoTaskListProps = {
  completedTodos: TodoItem[];
  openTodos: TodoItem[];
  onToggleTodo: (todoId: TodoItem["_id"]) => void;
  onDeleteTodo: (todoId: TodoItem["_id"]) => void;
  onReorderTodos: (todoIds: TodoItem["_id"][]) => Promise<void>;
};

export function TodoTaskList({
  completedTodos,
  openTodos,
  onToggleTodo,
  onDeleteTodo,
  onReorderTodos,
}: TodoTaskListProps) {
  const [orderedOpenTodos, setOrderedOpenTodos] = useState(openTodos);
  const isDraggingRef = useRef(false);
  const hasOpenTodos = openTodos.length > 0;
  const hasCompletedTodos = completedTodos.length > 0;

  useEffect(() => {
    if (!isDraggingRef.current) {
      setOrderedOpenTodos(openTodos);
    }
  }, [openTodos]);

  if (!hasOpenTodos && !hasCompletedTodos) {
    return (
      <TodoEmptyState
        icon={ClipboardList}
        title="No todos here"
        description="Add a todo to start shaping this list."
      />
    );
  }

  return (
    <LayoutGroup>
      <div className="flex flex-col gap-3">
        {hasOpenTodos ? (
          <DragDropProvider
            onDragStart={() => {
              isDraggingRef.current = true;
            }}
            onDragEnd={(event) => {
              isDraggingRef.current = false;

              if (event.canceled) {
                setOrderedOpenTodos(openTodos);
                return;
              }

              const { source } = event.operation;

              if (!isSortable(source)) {
                setOrderedOpenTodos(openTodos);
                return;
              }

              const { initialIndex, index } = source;

              if (initialIndex === index) {
                setOrderedOpenTodos(openTodos);
                return;
              }

              const nextTodos = [...orderedOpenTodos];
              const [movedTodo] = nextTodos.splice(initialIndex, 1);

              if (!movedTodo) {
                setOrderedOpenTodos(openTodos);
                return;
              }

              nextTodos.splice(index, 0, movedTodo);
              setOrderedOpenTodos(nextTodos);

              void onReorderTodos(nextTodos.map((todo) => todo._id)).catch(
                () => {
                  setOrderedOpenTodos(openTodos);
                },
              );
            }}
          >
            <motion.ul layout className="flex flex-col gap-1">
              {orderedOpenTodos.map((todo, index) => (
                <SortableTodoTaskItem
                  key={todo._id}
                  index={index}
                  group="regular-list"
                  isReorderEnabled
                  todo={todo}
                  onToggleTodo={onToggleTodo}
                  onDeleteTodo={onDeleteTodo}
                />
              ))}
            </motion.ul>
          </DragDropProvider>
        ) : (
          <TodoEmptyState
            icon={ClipboardList}
            title="No open todos"
            description="There are no open todos in this list right now."
          />
        )}

        {hasCompletedTodos && (
          <Accordion type="single" collapsible className="px-2">
            <AccordionItem value="completed" className="border-none">
              <AccordionTrigger className="rounded-md px-2 py-2 text-muted-foreground hover:text-foreground hover:no-underline gap-2 flex-none">
                Completed ({completedTodos.length})
              </AccordionTrigger>
              <AccordionContent className="pb-0">
                <motion.ul layout className="flex flex-col gap-1 pt-1">
                  {completedTodos.map((todo) => (
                    <TodoTaskMotionItem key={todo._id} todoId={todo._id}>
                      <TodoTaskItem
                        todo={todo}
                        onToggleTodo={onToggleTodo}
                        onDeleteTodo={onDeleteTodo}
                      />
                    </TodoTaskMotionItem>
                  ))}
                </motion.ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      </div>
    </LayoutGroup>
  );
}
