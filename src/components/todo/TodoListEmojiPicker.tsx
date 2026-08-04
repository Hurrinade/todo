import { lazy, Suspense, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type TodoListEmojiPickerProps = {
  id?: string;
  value?: string;
  disabled?: boolean;
  ariaLabel: string;
  onEmojiChange: (emoji: string) => void;
  className?: string;
};

type EmojiMartSelection = {
  native?: string;
};

const DEFAULT_LIST_EMOJI = "📝";
const TodoListEmojiPickerContent = lazy(
  () => import("@/components/todo/TodoListEmojiPickerContent"),
);

export function TodoListEmojiPicker({
  id,
  value,
  disabled,
  ariaLabel,
  onEmojiChange,
  className,
}: TodoListEmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const visibleEmoji = value?.trim() || DEFAULT_LIST_EMOJI;

  const handleEmojiSelect = (selectedEmoji: EmojiMartSelection) => {
    if (!selectedEmoji.native) {
      return;
    }

    onEmojiChange(selectedEmoji.native);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          size="icon-mobile-lg"
          aria-label={ariaLabel}
          disabled={disabled}
          className={cn("text-xl", className)}
        >
          <span aria-hidden="true">{visibleEmoji}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        className="w-[calc(100vw-2rem)] max-w-[352px] border-none bg-transparent p-0 shadow-lg [&_em-emoji-picker]:h-[min(435px,calc(100dvh-2rem))] [&_em-emoji-picker]:w-full [&_em-emoji-picker]:[--font-size:17px]"
      >
        <Suspense
          fallback={
            <div
              className="flex h-80 w-full items-center justify-center rounded-lg bg-popover text-sm text-muted-foreground"
              role="status"
            >
              Loading emoji picker
            </div>
          }
        >
          <TodoListEmojiPickerContent onEmojiSelect={handleEmojiSelect} />
        </Suspense>
      </PopoverContent>
    </Popover>
  );
}
