import { Pencil, Save, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type TodoListHeaderProps = {
  titleDraft: string;
  isRenaming: boolean;
  onTitleDraftChange: (title: string) => void;
  onRenameList: (event: React.SubmitEvent) => void;
  onDeleteList: () => void;
};

export function TodoListHeader({
  titleDraft,
  isRenaming,
  onTitleDraftChange,
  onRenameList,
  onDeleteList,
}: TodoListHeaderProps) {
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
            <Input
              aria-label="Todo list title"
              value={titleDraft}
              onChange={(event) => {
                onTitleDraftChange(event.target.value);
              }}
              className="h-auto min-w-0 flex-1 border-transparent bg-transparent px-0 py-1 text-3xl leading-tight font-semibold focus-visible:bg-background focus-visible:px-3"
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
    </header>
  );
}
