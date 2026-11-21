import { getAuthConfigProvider } from "@convex-dev/better-auth/auth-config";
import { convexAuthProvider } from "@convex-dev/auth/server";
import type { AuthConfig } from "convex/server";

export default {
  providers: [getAuthConfigProvider(), convexAuthProvider()],
} satisfies AuthConfig;
