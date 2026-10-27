import {
  createClient,
  type AuthFunctions,
  type GenericCtx,
} from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { requireActionCtx } from "@convex-dev/better-auth/utils";
import { Resend } from "@convex-dev/resend";
import { apiKey } from "@better-auth/api-key";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { betterAuth, type BetterAuthOptions } from "better-auth/minimal";
import { emailOTP } from "better-auth/plugins/email-otp";

import { components, internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import authConfig from "./auth.config";
import { syncBetterAuthUser } from "./system/users";
import authSchema from "./betterAuth/schema";

const authFunctions: AuthFunctions = internal.auth;

export const authComponent = createClient<DataModel, typeof authSchema>(
  components.betterAuth,
  {
    local: { schema: authSchema },
    authFunctions,
    triggers: {
      user: {
        onCreate: syncBetterAuthUser,
        onUpdate: syncBetterAuthUser,
      },
    },
  },
);

export const { onCreate, onUpdate, onDelete } = authComponent.triggersApi();

export function createAuthOptions(ctx: GenericCtx<DataModel>) {
  const siteUrl = process.env.SITE_URL;
  const baseURL = process.env.CONVEX_SITE_URL;
  const secret = process.env.BETTER_AUTH_SECRET;
  const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

  return {
    baseURL,
    secret,
    trustedOrigins: siteUrl ? [siteUrl] : [],
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        // MCP routes keys by this reserved prefix. Clients cannot override it.
        if (
          ctx.path === "/api-key/create" &&
          ctx.body?.prefix !== undefined &&
          ctx.body.prefix !== "ritodo_"
        ) {
          throw new APIError("BAD_REQUEST", {
            message: "Use the RiTodo key prefix.",
          });
        }
        if (
          ctx.path === "/sign-in/social" &&
          ctx.body?.provider === "google" &&
          (!googleClientId || !googleClientSecret)
        ) {
          throw new APIError("SERVICE_UNAVAILABLE", {
            message: "Google sign-in is unavailable. Continue with email.",
          });
        }
      }),
    },
    database: authComponent.adapter(ctx),
    emailAndPassword: { enabled: false },
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
    },
    socialProviders: {
      google: {
        clientId: googleClientId ?? "",
        clientSecret: googleClientSecret ?? "",
      },
    },
    plugins: [
      apiKey({
        defaultPrefix: "ritodo_",
        requireName: true,
        enableSessionForAPIKeys: false,
        keyExpiration: {
          defaultExpiresIn: 60 * 60 * 24 * 90,
          disableCustomExpiresTime: true,
        },
        rateLimit: { enabled: true, timeWindow: 60_000, maxRequests: 120 },
      }),
      emailOTP({
        otpLength: 6,
        expiresIn: 300,
        allowedAttempts: 3,
        storeOTP: "hashed",
        async sendVerificationOTP({ email, otp, type }) {
          if (type !== "sign-in") {
            throw new APIError("BAD_REQUEST", {
              message: "Only email sign-in is enabled.",
            });
          }
          const from = process.env.AUTH_EMAIL_FROM?.trim();
          if (!from || !process.env.RESEND_API_KEY?.trim()) {
            throw new APIError("SERVICE_UNAVAILABLE", {
              message: "Email sign-in is not configured.",
            });
          }

          // Login codes must reach real inboxes, including on the dev deployment.
          const resend = new Resend(components.resend, { testMode: false });
          await resend.sendEmail(requireActionCtx(ctx), {
            from,
            to: email,
            subject: "Your RiTodo sign-in code",
            text: `Your RiTodo sign-in code is ${otp}.\n\nIt expires in 5 minutes. If you did not request this code, ignore this email.`,
          });
        },
      }),
      crossDomain({ siteUrl: siteUrl ?? "" }),
      convex({ authConfig }),
    ],
  } satisfies BetterAuthOptions;
}

export function createAuth(ctx: GenericCtx<DataModel>) {
  if (
    !process.env.SITE_URL ||
    !process.env.CONVEX_SITE_URL ||
    !process.env.BETTER_AUTH_SECRET
  ) {
    throw new Error(
      "SITE_URL, CONVEX_SITE_URL and BETTER_AUTH_SECRET are required.",
    );
  }
  return betterAuth(createAuthOptions(ctx));
}
