import type { TodoItem } from "@/types/todo/todo.types";

export type TodoDetailTitleProps = {
  todo: TodoItem;
  onRenameTodo: (title: string) => Promise<void>;
};

export type TodoDetailViewProps = {
  todo: TodoItem;
  errorMessage: string | null;
  onBack: () => void;
  onRenameTodo: (title: string) => Promise<void>;
  onUpdateDescription: (description: string) => Promise<void>;
};

export type TodoDetailUnavailableProps = {
  message: string;
  onBack: () => void;
};

export type TitlePart =
  | {
      type: "text";
      value: string;
    }
  | {
      type: "link";
      href: string;
      value: string;
    };
