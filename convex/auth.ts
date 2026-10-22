import {
  createClient,
  type AuthFunctions,
  type GenericCtx,
} from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth/minimal";
import { emailOTP } from "better-auth/plugins/email-otp";

import { components, internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import authConfig from "./auth.config";
import { syncBetterAuthUser } from "./system/users";

const authFunctions: AuthFunctions = internal.auth;

export const authComponent = createClient<DataModel>(components.betterAuth, {
  authFunctions,
  triggers: {
    user: {
      onCreate: syncBetterAuthUser,
      onUpdate: syncBetterAuthUser,
    },
  },
});

export const { onCreate, onUpdate, onDelete } = authComponent.triggersApi();

export function createAuth(ctx: GenericCtx<DataModel>) {
  const siteUrl = process.env.SITE_URL;
  const baseURL = process.env.CONVEX_SITE_URL;
  const secret = process.env.BETTER_AUTH_SECRET;

  if (!siteUrl || !baseURL || !secret) {
    throw new Error(
      "SITE_URL, CONVEX_SITE_URL and BETTER_AUTH_SECRET are required.",
    );
  }

  return betterAuth({
    baseURL,
    secret,
    trustedOrigins: [siteUrl],
    database: authComponent.adapter(ctx),
    emailAndPassword: { enabled: false },
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
    },
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      },
    },
    plugins: [
      emailOTP({
        otpLength: 6,
        expiresIn: 300,
        allowedAttempts: 3,
        storeOTP: "hashed",
        async sendVerificationOTP() {
          // Pending sender selection. Never log OTPs or return them to the browser.
          throw new Error("Email delivery is not configured.");
        },
      }),
      crossDomain({ siteUrl }),
      convex({ authConfig }),
    ],
  });
}
