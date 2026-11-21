import { ConvexAuthProvider } from "@convex-dev/auth/react";
import {
  useOauth,
  useSignInWithGoogle,
} from "@convex-dev/auth/methods/google/react";
import { ConvexReactClient, useConvexAuth, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

import { api } from "@convex/_generated/api";
import { LEGACY_GOOGLE_REQUIRED } from "@convex/shared/googleSignIn";
import { envConfig } from "@/config/env";
import { signInWithLegacyGoogle } from "@/lib/auth-client";
import { GoogleSignInContext, NativeAccountContext } from "@/lib/auth-mode";
import { rememberLastUsedEmail } from "@/lib/last-used-email";
import ConvexBetterAuthProvider from "./ConvexBetterAuthProvider";

const nativeEnabled = import.meta.env.VITE_CONVEX_AUTH_V2 === "true";
const convex = nativeEnabled
  ? new ConvexReactClient(envConfig.convexUrl)
  : null;

export default function AuthProvider({ children }: { children: ReactNode }) {
  if (!convex) {
    return <ConvexBetterAuthProvider>{children}</ConvexBetterAuthProvider>;
  }

  return (
    <ConvexAuthProvider client={convex} api={api.nativeAuth}>
      <SelectAccountProvider>{children}</SelectAccountProvider>
    </ConvexAuthProvider>
  );
}

// The native provider owns OAuth redirects. A separate client keeps the legacy
// email code and existing Better Auth sessions working during the transition.
function SelectAccountProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const googleEnabled = useQuery(
    api.nativeAuth.isGoogleEnabled,
    isAuthenticated ? "skip" : {},
  );
  const { signIn } = useSignInWithGoogle(api.nativeAuth);
  const { flowError } = useOauth();
  const fallbackAttempt = useRef<typeof flowError>(null);
  const needsLegacyGoogle =
    flowError?.error === "OTHER_ERROR" &&
    flowError.cause instanceof ConvexError &&
    flowError.cause.data === LEGACY_GOOGLE_REQUIRED;

  useEffect(() => {
    if (
      isLoading ||
      isAuthenticated ||
      !needsLegacyGoogle ||
      fallbackAttempt.current === flowError
    ) {
      return;
    }
    fallbackAttempt.current = flowError;
    void signInWithLegacyGoogle().catch(() => {
      // The dialog remains usable if starting the fallback fails.
    });
  }, [isLoading, isAuthenticated, needsLegacyGoogle, flowError]);

  if (isAuthenticated || isLoading) {
    return (
      <NativeAccountContext.Provider value>
        <RememberNativeEmail />
        {children}
      </NativeAccountContext.Provider>
    );
  }

  return (
    <GoogleSignInContext.Provider
      value={
        needsLegacyGoogle || googleEnabled !== true
          ? signInWithLegacyGoogle
          : async () => {
              const result = await signIn();
              return result.status === "error" ? { error: {} } : {};
            }
      }
    >
      <ConvexBetterAuthProvider>{children}</ConvexBetterAuthProvider>
    </GoogleSignInContext.Provider>
  );
}

function RememberNativeEmail() {
  const { isAuthenticated } = useConvexAuth();
  const profile = useQuery(api.nativeAccount.me, isAuthenticated ? {} : "skip");
  const email = profile?.email;

  useEffect(() => {
    if (email) {
      rememberLastUsedEmail(email);
    }
  }, [email]);
  return null;
}
