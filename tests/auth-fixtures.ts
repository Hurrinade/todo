import {
  componentsGeneric,
  defineSchema,
  defineTable,
  mutationGeneric,
  queryGeneric,
  type FunctionReference,
} from "convex/server";
import { v } from "convex/values";
import { mutation } from "../convex/betterAuth/_generated/server";
import { KEY_PREFIX } from "../convex/shared/mcpKeys";

const now = () => Date.now();
export const legacyKey = "ritodo_old_fixture_key_9de2a920";

// Captured once from the old Better Auth key format (SHA-256, base64url).
const legacyDigest = "s_Oq3kKGuZBXrBwQjv9NoQHgN57ddzaW9-B8vDK3dqY";

const seedLegacy = mutation({
  args: { email: v.string(), verified: v.boolean(), seedGoogle: v.boolean() },
  returns: v.object({ owner: v.string(), keyId: v.string() }),
  handler: async (ctx, { email, verified, seedGoogle }) => {
    const owner = await ctx.db.insert("user", {
      email,
      emailVerified: verified,
      name: "Legacy Owner",
      createdAt: now(),
      updatedAt: now(),
    });
    if (seedGoogle) {
      await ctx.db.insert("account", {
        accountId: "legacy-google-subject",
        providerId: "google",
        userId: owner,
        createdAt: now(),
        updatedAt: now(),
      });
    }
    const keyId = await ctx.db.insert("apikey", {
      configId: "default",
      key: legacyDigest,
      referenceId: owner,
      name: "Existing client",
      start: "ritodo",
      prefix: KEY_PREFIX,
      enabled: true,
      expiresAt: now() + 90 * 86400000,
      requestCount: 1,
      lastRequest: now(),
      rateLimitEnabled: true,
      rateLimitMax: 2,
      rateLimitTimeWindow: 60_000,
      createdAt: now(),
      updatedAt: now(),
    });
    return { owner, keyId };
  },
});

export const legacyModules = {
  "convex/betterAuth/fixture.ts": async () => ({ seedLegacy }),
};
export const seedLegacyRef = componentsGeneric().betterAuth.fixture
  .seedLegacy as FunctionReference<
  "mutation",
  "internal",
  { email: string; verified: boolean; seedGoogle: boolean },
  { owner: string; keyId: string }
>;

export const resendFixtureSchema = defineSchema({
  emails: defineTable({ to: v.array(v.string()), text: v.string() }),
});

const sendEmail = mutationGeneric({
  args: {
    options: v.object({
      apiKey: v.string(),
      testMode: v.boolean(),
      initialBackoffMs: v.number(),
      retryAttempts: v.number(),
    }),
    from: v.string(),
    to: v.array(v.string()),
    subject: v.string(),
    text: v.string(),
  },
  handler: (ctx, { to, text }) => ctx.db.insert("emails", { to, text }),
});

const latest = queryGeneric({
  args: {},
  returns: v.union(v.string(), v.null()),
  handler: async (ctx) =>
    (await ctx.db.query("emails").order("desc").first())?.text ?? null,
});

export const resendModules = {
  "resend/_generated/server.ts": async () => ({}),
  "resend/lib.ts": async () => ({ sendEmail, latest }),
};
export const latestMail = componentsGeneric().resend.lib
  .latest as FunctionReference<
  "query",
  "internal",
  Record<string, never>,
  string | null
>;
