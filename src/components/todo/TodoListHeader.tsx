import { Pencil, RotateCcw, Save, Trash2 } from "lucide-react";

import { TodoFilterTabs } from "@/components/todo/TodoFilterTabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TodoFilter, TodoListWithStats } from "@/types";

type TodoListHeaderProps = {
  titleDraft: string;
  canSave: boolean;
  isRenaming: boolean;
  completedTodoCount: number;
  list: TodoListWithStats;
  activeFilter: TodoFilter;
  isClearingCompleted?: boolean;
  isUncheckingCompleted?: boolean;
  onClearCompleted: () => void;
  onFilterChange: (filter: TodoFilter) => void;
  onTitleDraftChange: (title: string) => void;
  onRenameList: (event: React.SubmitEvent) => void;
  onUncheckCompleted: () => void;
};

export function TodoListHeader({
  titleDraft,
  list,
  canSave,
  isRenaming,
  completedTodoCount,
  isClearingCompleted = false,
  isUncheckingCompleted = false,
  onClearCompleted,
  onTitleDraftChange,
  onRenameList,
  activeFilter,
  onFilterChange,
  onUncheckCompleted,
}: TodoListHeaderProps) {
  const shouldShowBulkActions = activeFilter !== "open";

  return (
    <header className="flex w-full flex-wrap items-start justify-between gap-4 border-b border-border bg-card/55 px-4 py-3">
      <div className="min-w-0 flex-1 basis-full md:basis-[min(42rem,58%)]">
        <Accordion
          type="single"
          collapsible
          defaultValue="list-controls"
          className="w-full"
        >
          <AccordionItem
            value="list-controls"
            className="overflow-hidden rounded-2xl border border-border/80 bg-card/85 shadow-sm"
          >
            <AccordionTrigger className="items-center gap-4 px-4 py-3 hover:no-underline data-[state=open]:rounded-b-none">
              <div className="min-w-0">
                <p className="text-[0.7rem] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                  Controls
                </p>
              </div>
            </AccordionTrigger>
            <AccordionContent className="border-t border-border/70 bg-background/55 px-4 pt-3 pb-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                <form
                  className="flex min-w-0 flex-1 items-center gap-2"
                  onSubmit={onRenameList}
                >
                  <Input
                    aria-label="Todo list title"
                    value={titleDraft}
                    onChange={(event) => {
                      onTitleDraftChange(event.target.value);
                    }}
                    className="h-11 min-w-0 flex-1 border-input bg-card px-4 text-base font-semibold text-foreground shadow-none"
                  />
                  {canSave ? (
                    <Button
                      type="submit"
                      variant="outline"
                      disabled={isRenaming || !titleDraft.trim()}
                      className="h-11 shrink-0 px-4"
                    >
                      {isRenaming ? (
                        <Pencil data-icon="inline-start" />
                      ) : (
                        <Save data-icon="inline-start" />
                      )}
                      Save
                    </Button>
                  ) : null}
                </form>
                {shouldShowBulkActions ? (
                  <div className="grid grid-cols-2 gap-2 md:flex md:shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={
                        completedTodoCount === 0 ||
                        isClearingCompleted ||
                        isUncheckingCompleted
                      }
                      onClick={onUncheckCompleted}
                      className="h-11"
                    >
                      <RotateCcw data-icon="inline-start" />
                      {isUncheckingCompleted
                        ? "Unchecking..."
                        : "Uncheck completed"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={
                        completedTodoCount === 0 ||
                        isClearingCompleted ||
                        isUncheckingCompleted
                      }
                      onClick={onClearCompleted}
                      className="h-11 text-destructive hover:text-destructive"
                    >
                      <Trash2 data-icon="inline-start" />
                      {isClearingCompleted ? "Clearing..." : "Clear completed"}
                    </Button>
                  </div>
                ) : null}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
      <div className="flex w-full justify-end md:w-auto md:max-w-[22rem]">
        <div className="w-full md:w-auto">
          <TodoFilterTabs
            list={list}
            activeFilter={activeFilter}
            onFilterChange={onFilterChange}
          />
        </div>
      </div>
    </header>
  );
}
