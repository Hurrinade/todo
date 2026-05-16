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
        className="w-[calc(100vw-2rem)] max-h-[90vh] max-w-xl gap-0 overflow-hidden p-0"
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
                <DialogTitle className="break-words pr-8">
                  {payload.title}
                </DialogTitle>
                <DialogDescription className="mt-2 break-words">
                  {payload.message}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="bg-card px-5 py-4 sm:px-6">
          <DialogFooter className="gap-2 border-t-0 pt-0 sm:justify-end">
            <Button
              type="button"
              variant={confirmButtonVariants[confirmVariant]}
              onClick={() => void handleConfirm()}
              disabled={isConfirming}
              className="w-full sm:min-w-28 sm:w-auto"
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
            >
              {payload.cancelText ?? "Cancel"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
