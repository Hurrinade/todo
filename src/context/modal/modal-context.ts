import { createContext } from "react";
import type { ActiveModal, ModalKey, ModalPayloadMap } from "@/types";

export type ModalContextType = {
  openModal: <K extends ModalKey>(key: K, payload: ModalPayloadMap[K]) => void;
  closeModal: () => void;
  activeModal: ActiveModal | null;
};

export const ModalContext = createContext<ModalContextType | undefined>(
  undefined,
);
