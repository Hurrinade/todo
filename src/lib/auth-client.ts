import {
  convexClient,
  crossDomainClient,
} from "@convex-dev/better-auth/client/plugins";
import { emailOTPClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { apiKeyClient } from "@better-auth/api-key/client";

import { envConfig } from "@/config/env";

export const authClient = createAuthClient({
  baseURL: envConfig.convexSiteUrl,
  plugins: [
    convexClient(),
    crossDomainClient(),
    emailOTPClient(),
    apiKeyClient(),
  ],
});

export function signInWithLegacyGoogle() {
  return authClient.signIn.social({
    provider: "google",
    // Return to the invite or page that opened the dialog.
    callbackURL: window.location.href,
  });
}

export async function signOutLegacy() {
  const result = await authClient.signOut();
  if (result.error) {
    throw new Error(result.error.message);
  }
}
