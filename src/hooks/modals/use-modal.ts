import { useContext } from "react";
import { ModalContext } from "@/context/modal/modal-context";
import type { ModalContextType } from "@/context/modal/modal-context";

export function useModal(): ModalContextType {
  const context = useContext(ModalContext);

  if (context === undefined) {
    throw new Error("useModal must be used within a ModalProvider");
  }

  return context;
}
