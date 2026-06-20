import type {
  BackgroundColorPreference,
  ResolvedTheme,
  ThemePreference,
  ThemeSnapshot,
} from "@/types";

const THEME_STORAGE_KEY = "theme";
const BACKGROUND_STORAGE_KEY = "background-color";
const SYSTEM_THEME_QUERY = "(prefers-color-scheme: dark)";
const BACKGROUND_CLASSES: Record<BackgroundColorPreference, string> = {
  blue: "background-blue",
  purple: "background-purple",
  regular: "background-regular",
};
const THEME_COLORS: Record<
  ResolvedTheme,
  Record<BackgroundColorPreference, string>
> = {
  light: {
    blue: "#e3efff",
    purple: "#ebe3ff",
    regular: "#f6f1e8",
  },
  dark: {
    blue: "#07111f",
    purple: "#100b1d",
    regular: "#040609",
  },
};

const listeners = new Set<() => void>();

const isBrowser = typeof window !== "undefined";

function isThemePreference(value: string | null): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

function isBackgroundColorPreference(
  value: string | null,
): value is BackgroundColorPreference {
  return value === "blue" || value === "purple" || value === "green";
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

function getStoredBackgroundColorPreference(): BackgroundColorPreference {
  if (!isBrowser) {
    return "blue";
  }

  try {
    const backgroundColor = window.localStorage.getItem(BACKGROUND_STORAGE_KEY);

    if (isBackgroundColorPreference(backgroundColor)) {
      return backgroundColor;
    }
  } catch {
    return "blue";
  }

  return "blue";
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
    backgroundColor: getStoredBackgroundColorPreference(),
  };
}

let themeSnapshot = createThemeSnapshot();

function updateThemeColorMeta(snapshot: ThemeSnapshot) {
  const themeColor = document.querySelector('meta[name="theme-color"]');

  if (themeColor) {
    themeColor.setAttribute(
      "content",
      THEME_COLORS[snapshot.resolvedTheme][snapshot.backgroundColor],
    );
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
  for (const backgroundClass of Object.values(BACKGROUND_CLASSES)) {
    document.documentElement.classList.toggle(
      backgroundClass,
      backgroundClass === BACKGROUND_CLASSES[snapshot.backgroundColor],
    );
  }
  updateThemeColorMeta(snapshot);
}

function refreshThemeSnapshot() {
  const nextSnapshot = createThemeSnapshot();

  if (
    themeSnapshot.preference !== nextSnapshot.preference ||
    themeSnapshot.resolvedTheme !== nextSnapshot.resolvedTheme ||
    themeSnapshot.backgroundColor !== nextSnapshot.backgroundColor
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
  if (
    event.key === THEME_STORAGE_KEY ||
    event.key === BACKGROUND_STORAGE_KEY ||
    event.key == null
  ) {
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

export function setBackgroundColorPreference(
  backgroundColor: BackgroundColorPreference,
) {
  if (!isBrowser) {
    return;
  }

  try {
    window.localStorage.setItem(BACKGROUND_STORAGE_KEY, backgroundColor);
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
