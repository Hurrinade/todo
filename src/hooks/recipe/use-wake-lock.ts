import { useEffect, useState } from "react";

const isWakeLockSupported =
  typeof navigator !== "undefined" && "wakeLock" in navigator;

/**
 * Keeps the screen on while `isOn`, so the phone doesn't lock mid-recipe.
 * The browser drops the lock when the app is hidden, so it is taken again
 * when the app comes back. Turned off when the component unmounts.
 */
export function useWakeLock() {
  const [isOn, setIsOn] = useState(false);

  // Syncs with the browser's wake lock, an external system.
  useEffect(() => {
    if (!isOn) {
      return;
    }

    let sentinel: WakeLockSentinel | null = null;
    let isActive = true;

    const acquire = async () => {
      if (document.visibilityState !== "visible") {
        return;
      }

      try {
        const next = await navigator.wakeLock.request("screen");

        if (isActive) {
          sentinel = next;
        } else {
          void next.release();
        }
      } catch {
        // Denied, e.g. by battery saver. Show the switch as off.
        setIsOn(false);
      }
    };

    const handleVisibilityChange = () => {
      void acquire();
    };

    void acquire();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isActive = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      void sentinel?.release();
    };
  }, [isOn]);

  return { isSupported: isWakeLockSupported, isOn, setIsOn };
}
