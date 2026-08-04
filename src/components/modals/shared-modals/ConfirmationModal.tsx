import { useState } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useNetworkStore } from "@/stores";
import type { ConfirmModalPayload, ConfirmVariant } from "@/types";

type ConfirmationModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payload: ConfirmModalPayload;
};

const confirmButtonVariants: Record<
  ConfirmVariant,
  "default" | "secondary" | "destructive"
> = {
  danger: "destructive",
  primary: "default",
  secondary: "secondary",
};

const alertIconVariants: Record<ConfirmVariant, string> = {
  danger: "border border-destructive/15 bg-destructive/10 text-destructive",
  primary: "border border-primary/15 bg-primary/10 text-primary",
  secondary: "border border-border bg-secondary text-secondary-foreground",
};

export default function ConfirmationModal({
  open,
  onOpenChange,
  payload,
}: ConfirmationModalProps) {
  const isOnline = useNetworkStore((state) => state.isOnline);
  const [isConfirming, setIsConfirming] = useState(false);
  const confirmVariant = payload.variant ?? "danger";

  const handleClose = async () => {
    if (isConfirming) {
      return;
    }

    if (payload.onCancel) {
      try {
        await payload.onCancel();
      } catch (error) {
        console.error("Confirmation cancel action failed:", error);
      }
    }

    onOpenChange(false);
  };

  const handleConfirm = async () => {
    if (isConfirming) {
      return;
    }

    setIsConfirming(true);

    try {
      await payload.onConfirm();
      onOpenChange(false);
    } catch (error) {
      console.error("Confirmation action failed:", error);
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          void handleClose();
        }
      }}
    >
      <DialogContent
        className="w-[calc(100vw-2rem)] max-w-xl gap-0 overflow-y-auto p-0"
        showCloseButton={!isConfirming}
      >
        <div className="px-5 pt-6 pb-5 sm:px-6">
          <DialogHeader className="text-left">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-2xl shadow-sm",
                  alertIconVariants[confirmVariant],
                )}
              >
                <TriangleAlert className="size-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="wrap-break-word pr-12 md:pr-8">
                  {payload.title}
                </DialogTitle>
                <DialogDescription className="mt-2 wrap-break-word">
                  {payload.message}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          {!isOnline ? (
            <p className="mt-4 rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning-foreground">
              Reconnect before confirming this change.
            </p>
          ) : null}
        </div>

        <div className="bg-card px-5 py-4 sm:px-6">
          <DialogFooter className="gap-2 border-t-0 pt-0 sm:justify-end">
            <Button
              type="button"
              variant={confirmButtonVariants[confirmVariant]}
              onClick={() => void handleConfirm()}
              disabled={!isOnline || isConfirming}
              className="w-full sm:min-w-28 sm:w-auto"
              size="mobile"
            >
              {isConfirming
                ? "Processing..."
                : (payload.confirmText ?? "Confirm")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleClose()}
              disabled={isConfirming}
              className="w-full sm:min-w-24 sm:w-auto"
              size="mobile"
            >
              {payload.cancelText ?? "Cancel"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
