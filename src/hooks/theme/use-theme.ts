import { useSyncExternalStore } from "react";
import type { ThemePreference } from "@/types";
import { getThemeSnapshot, setThemePreference, subscribeTheme } from "@/utils";

export function useTheme() {
  const theme = useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    getThemeSnapshot,
  );

  return {
    ...theme,
    setThemePreference: (preference: ThemePreference) => {
      setThemePreference(preference);
    },
  };
}
