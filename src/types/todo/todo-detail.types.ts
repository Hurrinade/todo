import type { ReactNode } from "react";

import type {
  TodoDetail,
  TodoItem,
  TodoListSummary,
  TodoNoteContent,
  TodoTitleContent,
} from "@/types/todo/todo.types";

export type TodoDetailPresentation = "page" | "panel";

export type TodoDetailRouteContext = {
  detail: TodoDetail | null | undefined;
  onClose: () => void;
  presentation: TodoDetailPresentation;
};

export type TodoDetailTitleProps = {
  todo: TodoItem;
  onRenameTodo: (title: TodoTitleContent) => Promise<void>;
};

export type TodoDetailViewProps = {
  detail: TodoDetail;
  errorMessage: string | null;
  onClose: () => void;
  onRenameTodo: (title: TodoTitleContent) => Promise<void>;
  onUpdateDescription: (description?: TodoNoteContent) => Promise<void>;
  presentation: TodoDetailPresentation;
};

export type TodoNoteEditorProps = {
  description?: TodoNoteContent;
  onUpdateDescription: (description?: TodoNoteContent) => Promise<void>;
};

export type TodoDetailUnavailableProps = {
  message: string;
  onClose: () => void;
  presentation: TodoDetailPresentation;
};

export type TodoWorkspaceProps = {
  activeListId: TodoListSummary["_id"] | null;
  detailPanel?: ReactNode;
  onActiveListIdChange: (listId: TodoListSummary["_id"] | null) => void;
};

export type TodoWorkspaceSplitViewProps = {
  children: ReactNode;
  detailPanel?: ReactNode;
};
