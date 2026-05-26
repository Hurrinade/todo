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
        className="w-[calc(100vw-2rem)] max-w-md gap-0 overflow-hidden p-0"
        showCloseButton={!isSubmitting}
      >
        <form onSubmit={handleSubmit}>
          <div className="px-5 pt-6 pb-5 sm:px-6">
            <DialogHeader className="text-left">
              <DialogTitle>Create a new list</DialogTitle>
              <DialogDescription>
                Choose a title and the layout that fits this list best.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-5 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="create-todo-list-emoji"
                  className="text-sm font-medium text-foreground"
                >
                  List emoji
                </label>
                <TodoListEmojiPicker
                  id="create-todo-list-emoji"
                  value={emoji}
                  ariaLabel="List emoji"
                  onEmojiChange={setEmoji}
                  disabled={isSubmitting}
                  className="size-10"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="create-todo-list-kind"
                  className="text-sm font-medium text-foreground"
                >
                  List type
                </label>
                <Select
                  value={kind}
                  onValueChange={(value) => {
                    setKind(value as TodoListKind);
                  }}
                >
                  <SelectTrigger
                    id="create-todo-list-kind"
                    aria-label="List type"
                    className="h-10 w-full"
                  >
                    <SelectValue placeholder="List type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regular">Regular list</SelectItem>
                    <SelectItem value="sectioned">Sectioned list</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="create-todo-list-title"
                  className="text-sm font-medium text-foreground"
                >
                  List name
                </label>
                <Input
                  id="create-todo-list-title"
                  aria-label="List name"
                  value={title}
                  autoFocus
                  onChange={(event) => {
                    setTitle(event.target.value);
                  }}
                  placeholder={
                    kind === "sectioned" ? "New sectioned list" : "New list"
                  }
                  className="h-10"
                />
              </div>
            </div>
          </div>

          <div className="bg-card px-5 py-4 sm:px-6">
            <DialogFooter className="gap-2 border-t-0 pt-0 sm:justify-end">
              <Button
                type="submit"
                disabled={isSubmitting || !title.trim()}
                className="w-full sm:min-w-28 sm:w-auto"
              >
                {isSubmitting ? "Creating..." : "Create list"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
                className="w-full sm:min-w-24 sm:w-auto"
              >
                Cancel
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
