import { ConvexBetterAuthProvider as BetterAuthProvider } from "@convex-dev/better-auth/react";
import { ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";

import { envConfig } from "@/config/env";
import { authClient } from "@/lib/auth-client";

const convex = new ConvexReactClient(envConfig.convexUrl);

export default function ConvexBetterAuthProvider({
  children,
}: {
  children: ReactNode;
}) {
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
