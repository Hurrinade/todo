const STORAGE_KEY = "ritodo:email-sign-in-return";

function invitePath(path: string) {
  const url = new URL(path, window.location.origin);
  return url.origin === window.location.origin &&
    /^\/invite\/[a-zA-Z0-9_-]+$/.test(url.pathname)
    ? url.pathname + url.search + url.hash
    : "/";
}

export function saveEmailSignInReturn() {
  try {
    window.localStorage.setItem(STORAGE_KEY, invitePath(window.location.href));
  } catch {
    // Sign-in can still return to the home page.
  }
}

export function readEmailSignInReturn() {
  try {
    return invitePath(window.localStorage.getItem(STORAGE_KEY) ?? "/");
  } catch {
    return "/";
  }
}

export function clearEmailSignInReturn() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage restrictions must not prevent signing in.
  }
}
