import { useSyncExternalStore } from "react";
import type { BackgroundColorPreference, ThemePreference } from "@/types";
import {
  getThemeSnapshot,
  setBackgroundColorPreference,
  setThemePreference,
  subscribeTheme,
} from "@/utils";

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
    setBackgroundColorPreference: (
      backgroundColor: BackgroundColorPreference,
    ) => {
      setBackgroundColorPreference(backgroundColor);
    },
  };
}
