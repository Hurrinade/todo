import { create } from "zustand";

import type { NetworkStoreState } from "@/types";

function getInitialOnlineState() {
  if (typeof navigator === "undefined") {
    return true;
  }

  return navigator.onLine;
}

export const useNetworkStore = create<NetworkStoreState>(() => ({
  isOnline: getInitialOnlineState(),
}));

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    useNetworkStore.setState({ isOnline: true });
  });
  window.addEventListener("offline", () => {
    useNetworkStore.setState({ isOnline: false });
  });
}
