import { v, type Infer } from "convex/values";

import { api, components, internal } from "./_generated/api";
import { env, internalMutation, mutation } from "./_generated/server";
import {
  EMAIL_CODE_ATTEMPTS,
  EMAIL_CODE_LENGTH,
  EMAIL_CODE_PATTERN,
  EMAIL_CODE_TTL_MS,
  emailChallengeUrl,
} from "./shared/emailSignIn";

const sendResult = v.union(
  v.object({
    success: v.literal(true),
    challengeId: v.id("emailSignInCodes"),
    browserSecret: v.string(),
  }),
  v.object({
    success: v.literal(false),
    error: v.union(v.literal("INVALID_EMAIL"), v.literal("RATE_LIMITED")),
  }),
);

const verifyResult = v.union(
  v.object({
    status: v.literal("complete"),
    tokens: v.object({
      accessToken: v.string(),
      refreshToken: v.string(),
      refreshTokenExpiresAt: v.number(),
      userId: v.string(),
    }),
  }),
  v.object({
    status: v.literal("error"),
    error: v.union(v.literal("CODE_INVALID"), v.literal("CODE_EXPIRED")),
  }),
);

function normalizeEmail(email: string) {
  return email.trim().toLowerCase().normalize("NFC");
}

function generateCode() {
  const possibilities = 10 ** EMAIL_CODE_LENGTH;
  const unbiasedLimit = 2 ** 32 - (2 ** 32 % possibilities);
  const random = new Uint32Array(1);
  do {
    crypto.getRandomValues(random);
  } while (random[0] >= unbiasedLimit);
  return String(random[0] % possibilities).padStart(EMAIL_CODE_LENGTH, "0");
}

async function hashSecret(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export const send = mutation({
  args: { email: v.string() },
  returns: sendResult,
  handler: async (ctx, { email }): Promise<Infer<typeof sendResult>> => {
    const normalized = normalizeEmail(email);
    const challengeId = await ctx.db.insert("emailSignInCodes", {
      email: normalized,
      expiresAt: Date.now() + EMAIL_CODE_TTL_MS,
      state: { kind: "pending", code: generateCode() },
    });

    // This calls deliverCode in the same transaction. The pending code only
    // exists inside this transaction, including on a failed send.
    const result = await ctx.runMutation(api.nativeAuth.sendEmailMagicLink, {
      email: email.trim(),
    });
    if (!result.success) {
      await ctx.db.delete("emailSignInCodes", challengeId);
      return { success: false, error: result.userError.error };
    }

    const pending = await ctx.db.get("emailSignInCodes", challengeId);
    if (pending?.state.kind !== "pending" || !pending.state.nativeCode) {
      throw new Error("Convex Auth did not supply an email challenge.");
    }

    const previous = await ctx.db
      .query("emailSignInCodes")
      .withIndex("by_email_and_kind", (q) =>
        q.eq("email", normalized).eq("state.kind", "ready"),
      )
      .unique();
    if (previous) await ctx.db.delete("emailSignInCodes", previous._id);

    const { browserSecret } = result;
    await ctx.db.patch("emailSignInCodes", challengeId, {
      state: {
        kind: "ready",
        browserSecretHash: await hashSecret(browserSecret),
        codeHash: await hashSecret(`${browserSecret}:${pending.state.code}`),
        nativeCode: pending.state.nativeCode,
        attemptsLeft: EMAIL_CODE_ATTEMPTS,
      },
    });
    await ctx.scheduler.runAfter(
      EMAIL_CODE_TTL_MS,
      internal.emailSignInCodes.expire,
      { challengeId },
    );
    return { success: true, challengeId, browserSecret };
  },
});

// The public Resend reference in setupEmailMagicLink points here. Keep the
// library's browser-bound proof on the server and deliver the short code.
export const deliverCode = internalMutation({
  args: {
    options: v.object({
      apiKey: v.string(),
      initialBackoffMs: v.number(),
      retryAttempts: v.number(),
      testMode: v.boolean(),
    }),
    from: v.string(),
    to: v.array(v.string()),
    subject: v.optional(v.string()),
    text: v.optional(v.string()),
  },
  returns: v.string(),
  handler: async (ctx, { options, from, to, text }): Promise<string> => {
    if (to.length !== 1 || !text)
      throw new Error("Expected a single email challenge.");
    const email = normalizeEmail(to[0]);
    const pending = await ctx.db
      .query("emailSignInCodes")
      .withIndex("by_email_and_kind", (q) =>
        q.eq("email", email).eq("state.kind", "pending"),
      )
      .unique();
    if (pending?.state.kind !== "pending" || pending.state.nativeCode) {
      throw new Error("An email code request is required.");
    }

    // The 2.1 email includes a plain-text URL with a code query parameter.
    // Fail closed if the configured URL is absent or the format changes.
    const url = emailChallengeUrl(env.SITE_URL);
    const line = text.split("\n").find((line) => line.startsWith(`${url}?`));
    const nativeCode = line && new URL(line).searchParams.get("code");
    if (!nativeCode) throw new Error("Missing Convex Auth email proof.");
    await ctx.db.patch("emailSignInCodes", pending._id, {
      state: { ...pending.state, nativeCode },
    });
    return ctx.runMutation(components.resend.lib.sendEmail, {
      options,
      from,
      to,
      subject: "Your RiTodo sign-in code",
      text: `Your RiTodo sign-in code is ${pending.state.code}.\n\nIt expires in 5 minutes. If you did not request this code, ignore this email.`,
    });
  },
});

export const verify = mutation({
  args: {
    challengeId: v.id("emailSignInCodes"),
    browserSecret: v.string(),
    code: v.string(),
  },
  returns: verifyResult,
  handler: async (
    ctx,
    { challengeId, browserSecret, code },
  ): Promise<Infer<typeof verifyResult>> => {
    const challenge = await ctx.db.get("emailSignInCodes", challengeId);
    if (
      !challenge ||
      challenge.state.kind !== "ready" ||
      challenge.expiresAt <= Date.now()
    ) {
      return { status: "error", error: "CODE_EXPIRED" };
    }
    const { state } = challenge;
    if (
      !EMAIL_CODE_PATTERN.test(code) ||
      (await hashSecret(browserSecret)) !== state.browserSecretHash
    ) {
      return { status: "error", error: "CODE_INVALID" };
    }
    if ((await hashSecret(`${browserSecret}:${code}`)) !== state.codeHash) {
      if (state.attemptsLeft <= 1) {
        await ctx.db.delete("emailSignInCodes", challengeId);
      } else {
        await ctx.db.patch("emailSignInCodes", challengeId, {
          state: { ...state, attemptsLeft: state.attemptsLeft - 1 },
        });
      }
      return { status: "error", error: "CODE_INVALID" };
    }

    // Native verification, session issuance and local consumption commit together.
    const result = await ctx.runMutation(
      api.nativeAuth.signInWithEmailMagicLink,
      {
        emailCode: state.nativeCode,
        browserSecret,
      },
    );
    await ctx.db.delete("emailSignInCodes", challengeId);
    return result.status === "complete"
      ? result
      : { status: "error", error: "CODE_EXPIRED" };
  },
});

export const expire = internalMutation({
  args: { challengeId: v.id("emailSignInCodes") },
  returns: v.null(),
  handler: async (ctx, { challengeId }) => {
    if (await ctx.db.get("emailSignInCodes", challengeId)) {
      await ctx.db.delete("emailSignInCodes", challengeId);
    }
    return null;
  },
});
