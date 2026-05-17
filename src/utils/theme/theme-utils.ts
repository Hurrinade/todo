import type { ResolvedTheme, ThemePreference, ThemeSnapshot } from "@/types";

const THEME_STORAGE_KEY = "theme";
const SYSTEM_THEME_QUERY = "(prefers-color-scheme: dark)";
const THEME_COLORS: Record<ResolvedTheme, string> = {
  light: "#f6f1e8",
  dark: "#171311",
};

const listeners = new Set<() => void>();

const isBrowser = typeof window !== "undefined";

function isThemePreference(value: string | null): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

function getStoredThemePreference(): ThemePreference {
  if (!isBrowser) {
    return "system";
  }

  try {
    const preference = window.localStorage.getItem(THEME_STORAGE_KEY);

    if (isThemePreference(preference)) {
      return preference;
    }
  } catch {
    return "system";
  }

  return "system";
}

function getSystemTheme(): ResolvedTheme {
  if (!isBrowser) {
    return "light";
  }

  return window.matchMedia(SYSTEM_THEME_QUERY).matches ? "dark" : "light";
}

function resolveThemePreference(preference: ThemePreference): ResolvedTheme {
  if (preference === "system") {
    return getSystemTheme();
  }

  return preference;
}

function createThemeSnapshot(): ThemeSnapshot {
  const preference = getStoredThemePreference();

  return {
    preference,
    resolvedTheme: resolveThemePreference(preference),
  };
}

let themeSnapshot = createThemeSnapshot();

function updateThemeColorMeta(resolvedTheme: ResolvedTheme) {
  const themeColor = document.querySelector('meta[name="theme-color"]');

  if (themeColor) {
    themeColor.setAttribute("content", THEME_COLORS[resolvedTheme]);
  }
}

function applyThemeSnapshot(snapshot: ThemeSnapshot) {
  if (!isBrowser) {
    return;
  }

  document.documentElement.classList.toggle(
    "dark",
    snapshot.resolvedTheme === "dark",
  );
  updateThemeColorMeta(snapshot.resolvedTheme);
}

function refreshThemeSnapshot() {
  const nextSnapshot = createThemeSnapshot();

  if (
    themeSnapshot.preference !== nextSnapshot.preference ||
    themeSnapshot.resolvedTheme !== nextSnapshot.resolvedTheme
  ) {
    themeSnapshot = nextSnapshot;
  }

  applyThemeSnapshot(themeSnapshot);
}

function notifyThemeListeners() {
  refreshThemeSnapshot();

  for (const listener of listeners) {
    listener();
  }
}

function handleSystemThemeChange() {
  if (getStoredThemePreference() === "system") {
    notifyThemeListeners();
  }
}

function handleStorageChange(event: StorageEvent) {
  if (event.key === THEME_STORAGE_KEY) {
    notifyThemeListeners();
  }
}

if (isBrowser) {
  applyThemeSnapshot(themeSnapshot);
  window
    .matchMedia(SYSTEM_THEME_QUERY)
    .addEventListener("change", handleSystemThemeChange);
  window.addEventListener("storage", handleStorageChange);
}

export function getThemeSnapshot() {
  return themeSnapshot;
}

export function setThemePreference(preference: ThemePreference) {
  if (!isBrowser) {
    return;
  }

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    return;
  }

  notifyThemeListeners();
}

export function subscribeTheme(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}
