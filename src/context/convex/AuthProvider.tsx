import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient, useConvexAuth, useQuery } from "convex/react";
import { useEffect } from "react";
import type { ReactNode } from "react";

import { api } from "@convex/_generated/api";
import { envConfig } from "@/config/env";
import { rememberLastUsedEmail } from "@/lib/last-used-email";

const convex = new ConvexReactClient(envConfig.convexUrl);

export default function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexAuthProvider client={convex} api={api.nativeAuth}>
      <RememberSignedInEmail />
      {children}
    </ConvexAuthProvider>
  );
}

function RememberSignedInEmail() {
  const { isAuthenticated } = useConvexAuth();
  const profile = useQuery(api.nativeAccount.me, isAuthenticated ? {} : "skip");
  const email = profile?.email;

  // Google and email callbacks both finish outside the original form.
  useEffect(() => {
    if (email) {
      rememberLastUsedEmail(email);
    }
  }, [email]);
  return null;
}
