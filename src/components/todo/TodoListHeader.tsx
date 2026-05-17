import dayjs from "dayjs";
import { Pencil, Save, Trash2 } from "lucide-react";
import type { FormEvent } from "react";

import { Button } from "@/components/ui/button";
import type { TodoListWithStats } from "@/types";

type TodoListHeaderProps = {
  list: TodoListWithStats;
  titleDraft: string;
  isRenaming: boolean;
  onTitleDraftChange: (title: string) => void;
  onRenameList: (event: FormEvent<HTMLFormElement>) => void;
  onDeleteList: () => void;
};

export function TodoListHeader({
  list,
  titleDraft,
  isRenaming,
  onTitleDraftChange,
  onRenameList,
  onDeleteList,
}: TodoListHeaderProps) {
  const totalTodoCount = list.openTodoCount + list.completedTodoCount;

  return (
    <header className="flex flex-col gap-4 border-b border-border bg-card/55 p-4 md:p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 space-y-3">
          <p className="text-xs font-semibold tracking-[0.28em] text-primary uppercase">
            Active list
          </p>
          <form
            className="flex max-w-3xl flex-col gap-2 sm:flex-row"
            onSubmit={onRenameList}
          >
            <input
              aria-label="Todo list title"
              value={titleDraft}
              onChange={(event) => {
                onTitleDraftChange(event.target.value);
              }}
              className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-0 py-1 text-3xl leading-tight font-semibold text-foreground outline-none focus:border-ring focus:bg-background focus:px-3 focus:ring-3 focus:ring-ring/30"
            />
            <Button
              type="submit"
              variant="outline"
              disabled={isRenaming || !titleDraft.trim()}
              className="w-full sm:w-auto"
            >
              {isRenaming ? (
                <Pencil data-icon="inline-start" />
              ) : (
                <Save data-icon="inline-start" />
              )}
              Save
            </Button>
          </form>
        </div>

        <Button
          type="button"
          variant="destructive"
          onClick={onDeleteList}
          className="w-full xl:w-auto"
        >
          <Trash2 data-icon="inline-start" />
          Delete list
        </Button>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <SummaryMetric label="Open" value={list.openTodoCount} />
        <SummaryMetric label="Completed" value={list.completedTodoCount} />
        <SummaryMetric label="Total" value={totalTodoCount} />
      </div>

      <p className="text-xs text-muted-foreground">
        Updated {dayjs(list.updatedAt).format("MMM D, YYYY HH:mm")}
      </p>
    </header>
  );
}

function SummaryMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-background/45 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}
