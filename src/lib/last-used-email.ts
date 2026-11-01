const STORAGE_KEY = "ritodo:last-used-email";

export function getLastUsedEmail(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

// This is a form preference, separate from the session and kept after sign-out.
export function rememberLastUsedEmail(email: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, email);
  } catch {
    // Storage restrictions must not prevent signing in or out.
  }
}
