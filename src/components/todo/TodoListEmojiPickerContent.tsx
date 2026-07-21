import Picker from "@emoji-mart/react";
import { use } from "react";

const emojiDataPromise = import("@/components/todo/todo-list-emoji-data").then(
  (module) => module.default,
);

type TodoListEmojiPickerContentProps = {
  onEmojiSelect: (selection: { native?: string }) => void;
};

export default function TodoListEmojiPickerContent({
  onEmojiSelect,
}: TodoListEmojiPickerContentProps) {
  const data = use(emojiDataPromise);

  return (
    <Picker
      data={data}
      dynamicWidth
      onEmojiSelect={onEmojiSelect}
      previewPosition="none"
      skinTonePosition="none"
    />
  );
}
