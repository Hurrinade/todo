import { useState } from "react";

import { TodoListEmojiPicker } from "@/components/todo/TodoListEmojiPicker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CreateTodoListModalPayload, TodoListKind } from "@/types";
import { useT } from "@/hooks";
import { useNetworkStore } from "@/stores";

type CreateTodoListModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payload: CreateTodoListModalPayload;
};

export default function CreateTodoListModal({
  open,
  onOpenChange,
  payload,
}: CreateTodoListModalProps) {
  const isOnline = useNetworkStore((state) => state.isOnline);
  const t = useT();
  const [title, setTitle] = useState("");
  const [emoji, setEmoji] = useState("📝");
  const [kind, setKind] = useState<TodoListKind>("regular");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    if (isSubmitting) {
      return;
    }

    onOpenChange(false);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedTitle = title.trim();

    if (!normalizedTitle || isSubmitting) {
      return;
    }

    if (!isOnline) {
      return;
    }

    setIsSubmitting(true);

    try {
      const didCreateList = await payload.onSubmit({
        title: normalizedTitle,
        emoji: emoji.trim() || undefined,
        kind,
      });

      if (didCreateList) {
        onOpenChange(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          handleClose();
        }
      }}
    >
      <DialogContent
        className="w-[calc(100vw-2rem)] max-w-md gap-0 overflow-y-auto p-0"
        showCloseButton={!isSubmitting}
      >
        <form onSubmit={handleSubmit}>
          <div className="px-5 pt-6 pb-5 sm:px-6">
            <DialogHeader className="text-left">
              <DialogTitle>{t.lists.createTitle}</DialogTitle>
              <DialogDescription>{t.lists.createDescription}</DialogDescription>
            </DialogHeader>

            <div className="mt-5 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="create-todo-list-emoji"
                  className="text-sm font-medium text-foreground"
                >
                  {t.lists.emoji}
                </label>
                <TodoListEmojiPicker
                  id="create-todo-list-emoji"
                  value={emoji}
                  ariaLabel={t.lists.emoji}
                  onEmojiChange={setEmoji}
                  disabled={!isOnline || isSubmitting}
                  className="pointer-fine:size-10"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="create-todo-list-kind"
                  className="text-sm font-medium text-foreground"
                >
                  {t.lists.kind}
                </label>
                <Select
                  value={kind}
                  disabled={!isOnline || isSubmitting}
                  onValueChange={(value) => {
                    setKind(value as TodoListKind);
                  }}
                >
                  <SelectTrigger
                    id="create-todo-list-kind"
                    aria-label={t.lists.kind}
                    className="h-10 w-full"
                  >
                    <SelectValue placeholder={t.lists.kind} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regular">
                      {t.lists.kinds.regular}
                    </SelectItem>
                    <SelectItem value="sectioned">
                      {t.lists.kinds.sectioned}
                    </SelectItem>
                    <SelectItem value="recipe">
                      {t.lists.kinds.recipe}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="create-todo-list-title"
                  className="text-sm font-medium text-foreground"
                >
                  {t.lists.name}
                </label>
                <Input
                  id="create-todo-list-title"
                  aria-label={t.lists.name}
                  value={title}
                  autoFocus
                  disabled={!isOnline || isSubmitting}
                  onChange={(event) => {
                    setTitle(event.target.value);
                  }}
                  placeholder={t.lists.kindPlaceholders[kind]}
                  className="h-10"
                />
              </div>
            </div>
            {!isOnline ? (
              <p className="mt-4 rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning-foreground">
                {t.lists.reconnectToCreate}
              </p>
            ) : null}
          </div>

          <div className="bg-card px-5 py-4 sm:px-6">
            <DialogFooter className="gap-2 border-t-0 pt-0 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
                className="w-full sm:min-w-24 sm:w-auto"
                size="mobile"
              >
                {t.common.cancel}
              </Button>
              <Button
                type="submit"
                disabled={!isOnline || isSubmitting || !title.trim()}
                className="w-full sm:min-w-28 sm:w-auto"
                size="mobile"
              >
                {isSubmitting ? t.common.creating : t.lists.create}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
