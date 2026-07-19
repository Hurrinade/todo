import type { Id } from "@convex/_generated/dataModel";

export type TodoListKind = "regular" | "sectioned";
export type TodoWorkspaceLocationState = {
  selectedListId?: Id<"todoLists">;
};

export type TodoNoteMark = {
  type: string;
  attrs?: Record<string, unknown>;
};

export type TodoNoteNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TodoNoteNode[];
  marks?: TodoNoteMark[];
  text?: string;
};

export type TodoNoteContent = {
  type: "doc";
  content: TodoNoteNode[];
};

export type TodoTitleLinkMark = {
  type: "link";
  attrs: {
    href: string;
    target?: "_blank" | null;
    rel?: "noopener noreferrer" | null;
    class?: null;
    title?: string | null;
  };
};

export type TodoTitleTextNode = {
  type: "text";
  marks?: TodoTitleLinkMark[];
  text: string;
};

export type TodoTitleParagraphNode = {
  type: "paragraph";
  content?: TodoTitleTextNode[];
};

export type TodoTitleContent = {
  type: "doc";
  content: [TodoTitleParagraphNode];
};

export type TodoListMember = {
  userId: string;
  firstName?: string;
  lastName?: string;
};

export type TodoListWithStats = {
  _id: Id<"todoLists">;
  _creationTime: number;
  title: string;
  emoji?: string;
  kind: TodoListKind;
  userId: string;
  createdAt: number;
  order?: number;
  updatedAt: number;
  openTodoCount: number;
  completedTodoCount: number;
  members: TodoListMember[];
};

export type TodoItem = {
  _id: Id<"todos">;
  _creationTime: number;
  listId: Id<"todoLists">;
  sectionId?: Id<"todoSections">;
  title: TodoTitleContent;
  description?: TodoNoteContent;
  isCompleted: boolean;
  completedAt?: number;
  order?: number;
  createdAt: number;
  updatedAt: number;
};

export type TodoSection = {
  _id: Id<"todoSections">;
  _creationTime: number;
  listId: Id<"todoLists">;
  title: string;
  order?: number;
  isDefault: boolean;
  updatedAt: number;
};

export type TodoInvitePreview = {
  listId: Id<"todoLists">;
  listTitle: string;
  token: string;
  expiresAt: number;
  createdByUserId: string;
  isCurrentUserMember: boolean;
};

export type TodoInviteCreateResult = {
  inviteId: Id<"todoListInvites">;
  token: string;
  expiresAt: number;
  listId: Id<"todoLists">;
};

export type TodoInviteAcceptResult = {
  listId: Id<"todoLists">;
};
