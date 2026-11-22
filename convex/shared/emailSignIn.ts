export const EMAIL_CODE_LENGTH = 6;
export const EMAIL_CODE_TTL_MS = 5 * 60 * 1000;
export const EMAIL_CODE_ATTEMPTS = 3;
export const EMAIL_CODE_PATTERN = /^[0-9]{6}$/;

// This URL is used to exchange the native proof on the server. Emails contain only the code.
export function emailChallengeUrl(siteUrl: string) {
  return new URL("/sign-in-with-link", siteUrl).href;
}
