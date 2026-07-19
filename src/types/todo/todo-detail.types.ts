import type {
  TodoItem,
  TodoNoteContent,
  TodoTitleContent,
} from "@/types/todo/todo.types";

export type TodoDetailTitleProps = {
  todo: TodoItem;
  onRenameTodo: (title: TodoTitleContent) => Promise<void>;
};

export type TodoDetailViewProps = {
  todo: TodoItem;
  errorMessage: string | null;
  onBack: () => void;
  onRenameTodo: (title: TodoTitleContent) => Promise<void>;
  onUpdateDescription: (description?: TodoNoteContent) => Promise<void>;
};

export type TodoNoteEditorProps = {
  description?: TodoNoteContent;
  onUpdateDescription: (description?: TodoNoteContent) => Promise<void>;
};

export type TodoDetailUnavailableProps = {
  message: string;
  onBack: () => void;
};
