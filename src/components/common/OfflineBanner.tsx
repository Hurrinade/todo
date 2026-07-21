import { WifiOff } from "lucide-react";

import { useNetworkStore } from "@/stores";

export default function OfflineBanner() {
  const isOnline = useNetworkStore((state) => state.isOnline);

  if (isOnline) {
    return null;
  }

  return (
    <div
      className="relative z-50 flex min-h-10 shrink-0 items-center justify-center gap-2 bg-warning-soft px-4 py-2 text-center text-sm font-medium text-warning-foreground"
      role="status"
    >
      <WifiOff className="size-4 shrink-0" aria-hidden="true" />
      You're offline. Viewing remains available, but changes are paused.
    </div>
  );
}
