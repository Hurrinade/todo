import type { ReactNode } from "react";

import type {
  TodoDetail,
  TodoItem,
  TodoListSummary,
  TodoNoteContent,
  TodoRecipe,
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
  /** Overrides the title color and size, e.g. white on a recipe photo. */
  className?: string;
};

export type TodoDetailViewProps = {
  detail: TodoDetail;
  errorMessage: string | null;
  onClose: () => void;
  onRenameTodo: (title: TodoTitleContent) => Promise<void>;
  onUpdateDescription: (description?: TodoNoteContent) => Promise<void>;
  presentation: TodoDetailPresentation;
};

export type RecipeDetailViewProps = TodoDetailViewProps & {
  recipe: TodoRecipe;
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
