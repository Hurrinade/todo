import { ConvexBetterAuthProvider as BetterAuthProvider } from "@convex-dev/better-auth/react";
import { ConvexReactClient } from "convex/react";
import { useEffect, type ReactNode } from "react";

import { envConfig } from "@/config/env";
import { authClient } from "@/lib/auth-client";
import { rememberLastUsedEmail } from "@/lib/last-used-email";

const convex = new ConvexReactClient(envConfig.convexUrl);

export default function ConvexBetterAuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { data: session } = authClient.useSession();
  const email = session?.user.email;

  // Google returns through a redirect, so sync the verified session to browser storage.
  useEffect(() => {
    if (email) {
      rememberLastUsedEmail(email);
    }
  }, [email]);

  return (
    <BetterAuthProvider
      client={convex}
      // @ts-expect-error Convex's provider infers session as never on patched Better Auth. https://github.com/convex/better-auth/issues/420
      authClient={authClient}
    >
      {children}
    </BetterAuthProvider>
  );
}
