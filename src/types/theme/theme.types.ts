import type { LucideIcon } from "lucide-react";

export type ThemePreference = "system" | "light" | "dark";

export type ResolvedTheme = "light" | "dark";

export type ThemeSnapshot = {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
};

export type ThemeOption = {
  value: ThemePreference;
  label: string;
  icon: LucideIcon;
};
