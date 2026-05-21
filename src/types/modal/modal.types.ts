import type { TodoListKind } from "@/types/todo/todo.types";

export type ConfirmVariant = "danger" | "primary" | "secondary";

export type ConfirmModalPayload = {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void | Promise<void>;
};

export type CreateTodoListModalValues = {
  title: string;
  kind: TodoListKind;
};

export type CreateTodoListModalPayload = {
  onSubmit: (values: CreateTodoListModalValues) => Promise<boolean>;
};

export type ModalPayloadMap = {
  confirm: ConfirmModalPayload;
  createTodoList: CreateTodoListModalPayload;
};

export type ModalKey = keyof ModalPayloadMap;

export type ActiveModal = {
  [K in ModalKey]: {
    key: K;
    payload: ModalPayloadMap[K];
  };
}[ModalKey];
