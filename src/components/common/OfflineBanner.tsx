import { WifiOff } from "lucide-react";

import { useT } from "@/hooks";
import { useNetworkStore } from "@/stores";

export default function OfflineBanner() {
  const isOnline = useNetworkStore((state) => state.isOnline);
  const t = useT();

  if (isOnline) {
    return null;
  }

  return (
    <div
      className="relative z-50 flex min-h-10 shrink-0 items-center justify-center gap-2 bg-warning-soft px-4 py-2 text-center text-sm font-medium text-warning-foreground"
      role="status"
    >
      <WifiOff className="size-4 shrink-0" aria-hidden="true" />
      {t.common.offlineBanner}
    </div>
  );
}
