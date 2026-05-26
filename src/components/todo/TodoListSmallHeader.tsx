import { useMutation } from "convex/react";
import { useState } from "react";

import { TodoListEmojiPicker } from "@/components/todo/TodoListEmojiPicker";
import { Input } from "@/components/ui/input";
import { todoApi } from "@/config/convex-api";
import { useTodoErrorStore } from "@/stores/todo/todo-error-store";
import type { TodoListWithStats } from "@/types";

export function TodoListSmallHeader({ list }: { list: TodoListWithStats }) {
  const [listTitleDraft, setListTitleDraft] = useState<{
    listId: TodoListWithStats["_id"];
    title: string;
  } | null>(null);
  const [listEmojiDraft, setListEmojiDraft] = useState<{
    listId: TodoListWithStats["_id"];
    emoji: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const renameList = useMutation(todoApi.mutations.todoLists.rename);
  const updateListEmoji = useMutation(todoApi.mutations.todoLists.updateEmoji);

  const clearErrorMessage = useTodoErrorStore(
    (state) => state.clearErrorMessage,
  );
  const setUnknownErrorMessage = useTodoErrorStore(
    (state) => state.setUnknownErrorMessage,
  );

  const handleRenameList = async () => {
    if (isLoading) {
      return;
    }

    if (!normalizedDraftTitle) {
      setListTitleDraft(null);
      return;
    }

    if (normalizedDraftTitle === normalizedActiveListTitle) {
      setListTitleDraft(null);
      return;
    }

    setIsLoading(true);
    clearErrorMessage();

    try {
      await renameList({ listId: list._id, title: normalizedDraftTitle });
      setListTitleDraft(null);
    } catch (error) {
      setUnknownErrorMessage(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateListEmoji = async (emoji: string) => {
    if (isLoading) {
      return;
    }

    const normalizedEmoji = emoji.trim();

    setListEmojiDraft({
      listId: list._id,
      emoji: normalizedEmoji,
    });

    if (normalizedEmoji === normalizedActiveListEmoji) {
      setListEmojiDraft(null);
      return;
    }

    setIsLoading(true);
    clearErrorMessage();

    try {
      await updateListEmoji({ listId: list._id, emoji: normalizedEmoji });
      setListEmojiDraft(null);
    } catch (error) {
      setListEmojiDraft(null);
      setUnknownErrorMessage(error);
    } finally {
      setIsLoading(false);
    }
  };

  const visibleListTitle =
    listTitleDraft && listTitleDraft.listId === list._id
      ? listTitleDraft.title
      : list.title;
  const visibleListEmoji =
    listEmojiDraft && listEmojiDraft.listId === list._id
      ? listEmojiDraft.emoji
      : (list.emoji ?? "");

  const normalizedDraftTitle = visibleListTitle.trim();
  const normalizedActiveListTitle = list.title.trim();
  const normalizedActiveListEmoji = list.emoji?.trim() ?? "";

  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <TodoListEmojiPicker
        value={visibleListEmoji}
        ariaLabel="Todo list emoji"
        onEmojiChange={(emoji) => {
          void handleUpdateListEmoji(emoji);
        }}
        disabled={isLoading}
        className="size-10 border-none bg-card/80 shadow-none"
      />

      <form
        onSubmit={(event) => {
          event.preventDefault();
          handleRenameList();
        }}
        className="min-w-0 flex-1"
      >
        <Input
          aria-label="Todo list title"
          value={visibleListTitle}
          disabled={isLoading}
          onBlur={handleRenameList}
          onChange={(event) => {
            const title = event.target.value;
            setListTitleDraft({ listId: list._id, title });
          }}
          className="min-w-0 border-none bg-transparent! p-0! text-[18px]! font-semibold outline-none focus-visible:ring-0"
        />
      </form>
    </div>
  );
}
