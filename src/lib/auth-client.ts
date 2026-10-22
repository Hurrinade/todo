import {
  convexClient,
  crossDomainClient,
} from "@convex-dev/better-auth/client/plugins";
import { emailOTPClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { envConfig } from "@/config/env";

export const authClient = createAuthClient({
  baseURL: envConfig.convexSiteUrl,
  plugins: [convexClient(), crossDomainClient(), emailOTPClient()],
});
