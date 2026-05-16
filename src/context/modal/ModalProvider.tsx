import { useCallback, useMemo, useState } from "react";
import ConfirmationModal from "@/components/modals/shared-modals/ConfirmationModal";
import { useModal } from "@/hooks/modals/use-modal";
import { ModalContext } from "@/context/modal/modal-context";
import type { ActiveModal, ModalKey, ModalPayloadMap } from "@/types";

type ModalRegistryEntry<K extends ModalKey> = {
  getInstanceKey: (payload: ModalPayloadMap[K]) => string;
  render: (props: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    payload: ModalPayloadMap[K];
  }) => React.ReactNode;
};

type ModalRegistry = {
  [K in ModalKey]: ModalRegistryEntry<K>;
};

const modalRegistry: ModalRegistry = {
  confirm: {
    getInstanceKey: () => "confirm",
    render: ({ open, onOpenChange, payload }) => (
      <ConfirmationModal
        open={open}
        onOpenChange={onOpenChange}
        payload={payload}
      />
    ),
  },
};

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [activeModal, setActiveModal] = useState<ActiveModal | null>(null);

  const openModal = useCallback(
    <K extends ModalKey>(key: K, payload: ModalPayloadMap[K]) => {
      setActiveModal({ key, payload });
    },
    [],
  );

  const closeModal = useCallback(() => {
    setActiveModal(null);
  }, []);

  const contextValue = useMemo(
    () => ({ openModal, closeModal, activeModal }),
    [openModal, closeModal, activeModal],
  );

  return (
    <ModalContext.Provider value={contextValue}>
      {children}
      <ModalHost />
    </ModalContext.Provider>
  );
}

function ModalHost() {
  const { activeModal, closeModal } = useModal();

  if (!activeModal) {
    return null;
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      closeModal();
    }
  };

  const renderModal = <K extends ModalKey>(
    key: K,
    payload: ModalPayloadMap[K],
  ) => {
    const entry = modalRegistry[key];
    const instanceKey = entry.getInstanceKey(payload);

    return (
      <div key={instanceKey}>
        {entry.render({
          open: true,
          onOpenChange: handleOpenChange,
          payload,
        })}
      </div>
    );
  };

  return renderModal(activeModal.key, activeModal.payload);
}
