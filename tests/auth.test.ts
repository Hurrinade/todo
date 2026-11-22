import { describe, expect, mock, spyOn, test } from "bun:test";
import { componentsGeneric, type FunctionReference } from "convex/server";
import { convexTest } from "convex-test";
import { dirname, join } from "node:path";
import { Webhook } from "svix";

import { api, internal } from "../convex/_generated/api";
import schema from "../convex/schema";
import betterAuthSchema from "../convex/betterAuth/schema";
import { authenticateMcpRequest } from "../convex/mcp/auth";
import {
  latestMail,
  legacyKey,
  legacyModules,
  registerPackageComponents,
  resendFixtureSchema,
  resendModules,
  seedLegacyRef,
} from "./auth-fixtures";
import { modulesIn } from "./convex-modules";

process.env.SITE_URL = "http://localhost:5174";
process.env.CONVEX_SITE_URL = "https://auth.example.test";
process.env.CONVEX_CLOUD_URL = "https://auth.example.test";
process.env.RESEND_API_KEY = "re_local_fixture_no_outbound_mail";
process.env.AUTH_EMAIL_FROM = "RiTodo <fixture@example.test>";

const testEmail = "legacy@gmail.com";
const day = 86400000;
const authDir = dirname(
  Bun.resolveSync("@convex-dev/auth/package.json", import.meta.dir),
);
const authSource = join(authDir, "src");

async function setup({ linked = true, verified = true } = {}) {
  const t = convexTest(schema, modulesIn("convex"));
  t.registerComponent("betterAuth", betterAuthSchema, {
    ...modulesIn("convex/betterAuth"),
    ...legacyModules,
  });
  t.registerComponent("resend", resendFixtureSchema, resendModules);
  for (const [mount, source] of [
    ["auth", "component"],
    ["authGoogle", "components/google"],
    ["authEmail", "components/email"],
  ]) {
    await registerPackageComponents(t, join(authSource, source), mount);
  }
  for (const name of ["rate-limiter", "batch-worker"]) {
    const directory = dirname(
      Bun.resolveSync(`@convex-dev/${name}/package.json`, authDir),
    );
    const mount = name === "rate-limiter" ? "rateLimiter" : "batchWorker";
    await registerPackageComponents(
      t,
      join(directory, "src/component"),
      `authEmail/${mount}`,
    );
  }
  const { owner, keyId } = await t.mutation(seedLegacyRef, {
    email: testEmail,
    verified,
    seedGoogle: true,
  });
  const ids = await t.run(async (ctx) => {
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      clerkId: "user_legacy_marko",
      ...(linked ? { betterAuthId: owner } : {}),
      email: testEmail,
      updatedAt: now,
    });
    const owned = await ctx.db.insert("todoLists", {
      title: "Legacy owned",
      kind: "regular",
      userId: "user_legacy_marko",
      openTodoCount: 0,
      completedTodoCount: 0,
      memberCount: 1,
      updatedAt: now,
    });
    const shared = await ctx.db.insert("todoLists", {
      title: "Legacy shared",
      kind: "regular",
      userId: "user_other",
      openTodoCount: 0,
      completedTodoCount: 0,
      memberCount: 1,
      updatedAt: now,
    });
    for (const listId of [owned, shared]) {
      await ctx.db.insert("todoListUsers", {
        listId,
        userId: "user_legacy_marko",
      });
    }
    const invite = await ctx.db.insert("todoListInvites", {
      listId: shared,
      token: "test-invite",
      createdByUserId: "user_legacy_marko",
      expiresAt: now + day,
    });
    return { userId, owned, shared, invite };
  });
  return { t, authUser: { _id: owner }, keyId, ...ids };
}

type Fixture = Awaited<ReturnType<typeof setup>>["t"];

function signedIn(
  t: Fixture,
  tokens: {
    accessToken: string;
    refreshToken: string;
    refreshTokenExpiresAt: number;
  },
) {
  const jwt = Buffer.from(tokens.accessToken.split(".")[1], "base64url");
  const { sub, iss, iat, exp } = JSON.parse(jwt.toString());
  return {
    actor: t.withIdentity({ subject: sub, issuer: iss }),
    tokens,
    iat,
    exp,
  };
}

async function getEmailCode(t: Fixture, email: string) {
  const result = await t
    .withRequestMetadata({ ip: "192.0.2.10" })
    .mutation(api.emailSignInCodes.send, { email });
  if (!result.success) throw new Error(result.error);
  const mail = await t.query(latestMail, {});
  expect(mail).not.toContain("https://");
  expect(mail).not.toContain("http://");
  const code = mail?.match(/code is ([0-9]{6})\./)?.[1];
  if (!code) throw new Error("No six-digit sign-in code was sent.");
  return {
    challengeId: result.challengeId,
    browserSecret: result.browserSecret,
    code,
  };
}

async function finishEmail(t: Fixture, email = testEmail) {
  const proof = await getEmailCode(t, email);
  const result = await t.mutation(api.emailSignInCodes.verify, proof);
  if (result.status !== "complete")
    throw new Error("Fixture email sign-in failed.");
  return signedIn(t, result.tokens);
}

async function googleTicket(t: Fixture, sub: string, email = testEmail) {
  const { encryptTicketPayload } = await import(
    join(authSource, "lib/oauth/crypto.ts")
  );
  const { sha256Hex } = await import(join(authSource, "lib/crypto.ts"));
  const code = crypto.randomUUID();
  const state = crypto.randomUUID();
  const createTicket = componentsGeneric().authGoogle.provider
    .createTicket as FunctionReference<
    "mutation",
    "internal",
    { ticketCodeHash: string; stateHash: string; encryptedPayload: string },
    null
  >;
  await t.mutation(createTicket, {
    ticketCodeHash: await sha256Hex(code),
    stateHash: await sha256Hex(state),
    encryptedPayload: await encryptTicketPayload(
      code,
      JSON.stringify({
        claims: { sub, email, email_verified: true },
      }),
    ),
  });
  return { code, state };
}

function callMcp(t: Fixture, token: string) {
  return t.fetch("/mcp", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: "list_todo_lists", arguments: {} },
    }),
  });
}

describe("native account cutover", () => {
  test("only a browser-bound code recovers an existing verified account and its access", async () => {
    const { t, userId, owned, shared, invite } = await setup();
    const proof = await getEmailCode(t, testEmail);
    expect(
      await t.mutation(api.emailSignInCodes.verify, {
        ...proof,
        browserSecret: "other-browser",
      }),
    ).toMatchObject({ status: "error" });
    await expect(t.query(api.queries.todoLists.list, {})).rejects.toThrow(
      "signed in",
    );
    const result = await t.mutation(api.emailSignInCodes.verify, proof);
    if (result.status !== "complete") throw new Error("Recovery failed.");
    const { actor } = signedIn(t, result.tokens);
    expect(await actor.query(api.nativeAccount.me, {})).toMatchObject({
      id: userId,
    });
    const lists = await actor.query(api.queries.todoLists.list, {});
    expect(lists.map((list) => list._id).sort()).toEqual(
      [owned, shared].sort(),
    );
    expect(
      await actor.query(api.queries.todoInvites.getByToken, {
        token: "test-invite",
      }),
    ).toMatchObject({ isCurrentUserMember: true });
    expect(
      (await t.run((ctx) => ctx.db.get("todoListInvites", invite)))
        ?.createdByUserId,
    ).toBe("user_legacy_marko");
    expect(await t.mutation(api.emailSignInCodes.verify, proof)).toMatchObject({
      status: "error",
    });

    await actor.mutation(api.nativeAccount.updateName, { name: "New Name" });
    await t.mutation(internal.system.users.syncFromClerk, {
      clerkId: "user_legacy_marko",
      email: "old@example.test",
      firstName: "Old",
    });
    expect(await actor.query(api.nativeAccount.me, {})).toMatchObject({
      name: "New Name",
      email: testEmail,
      id: userId,
    });
  });

  test("an email code expires and a resend invalidates the previous challenge", async () => {
    const { t } = await setup();
    const first = await getEmailCode(t, testEmail.toUpperCase());
    const resent = await getEmailCode(t, testEmail);
    expect(await t.mutation(api.emailSignInCodes.verify, first)).toEqual({
      status: "error",
      error: "CODE_EXPIRED",
    });
    const now = Date.now();
    const clock = spyOn(Date, "now").mockReturnValue(now + 5 * 60_000);
    try {
      expect(await t.mutation(api.emailSignInCodes.verify, resent)).toEqual({
        status: "error",
        error: "CODE_EXPIRED",
      });
    } finally {
      clock.mockRestore();
    }
    await finishEmail(t);
  });

  test("incorrect code attempts are bounded and the raw sender cannot bypass the adapter", async () => {
    const { t } = await setup();
    await expect(
      t
        .withRequestMetadata({ ip: "192.0.2.10" })
        .mutation(api.nativeAuth.sendEmailMagicLink, { email: testEmail }),
    ).rejects.toThrow("An email code request is required.");
    expect(await t.query(latestMail, {})).toBeNull();
    const proof = await getEmailCode(t, testEmail);
    const wrongCode = proof.code === "000000" ? "000001" : "000000";
    for (let attempt = 0; attempt < 3; attempt++) {
      expect(
        await t.mutation(api.emailSignInCodes.verify, {
          ...proof,
          code: wrongCode,
        }),
      ).toEqual({
        status: "error",
        error: "CODE_INVALID",
      });
    }
    expect(await t.mutation(api.emailSignInCodes.verify, proof)).toEqual({
      status: "error",
      error: "CODE_EXPIRED",
    });
  });

  test("an unverified legacy email never grants access through an email code", async () => {
    const { t, userId } = await setup({ verified: false });
    const { actor } = await finishEmail(t);
    expect((await actor.query(api.nativeAccount.me, {}))?.id).not.toBe(userId);
    expect(await actor.query(api.queries.todoLists.list, {})).toEqual([]);
  });

  test("Google retains exact subject ownership and requires recovery for an unbound legacy address", async () => {
    const { t, userId } = await setup();
    const known = await googleTicket(
      t,
      "legacy-google-subject",
      "changed@example.test",
    );
    expect(
      await t.mutation(api.nativeAuth.completeSignInWithGoogle, {
        ...known,
        state: "other-browser",
      }),
    ).toMatchObject({ status: "error" });
    const result = await t.mutation(
      api.nativeAuth.completeSignInWithGoogle,
      known,
    );
    if (result.status !== "complete") throw new Error("Google sign-in failed.");
    expect(
      await signedIn(t, result.tokens).actor.query(api.nativeAccount.me, {}),
    ).toMatchObject({ id: userId });
    const unknown = await googleTicket(t, "unbound");
    await expect(
      t.mutation(api.nativeAuth.completeSignInWithGoogle, unknown),
    ).rejects.toThrow("USE_EMAIL_CODE");

    const { actor } = await finishEmail(t);
    expect((await actor.query(api.nativeAccount.me, {}))?.id).toBe(userId);
    const afterRecovery = await t.mutation(
      api.nativeAuth.completeSignInWithGoogle,
      unknown,
    );
    if (afterRecovery.status !== "complete")
      throw new Error("Google sign-in after recovery failed.");
    expect(
      await signedIn(t, afterRecovery.tokens).actor.query(
        api.nativeAccount.me,
        {},
      ),
    ).toMatchObject({ id: userId });

    await finishEmail(t, "outside-google@example.test");
    await expect(
      t.mutation(
        api.nativeAuth.completeSignInWithGoogle,
        await googleTicket(t, "outside-google", "outside-google@example.test"),
      ),
    ).rejects.toThrow("USE_EMAIL_CODE");
  });

  test("native refresh works after 45 days and expires at the 90-day absolute cap", async () => {
    const { t } = await setup();
    const start = Date.now();
    const { tokens, exp, iat } = await finishEmail(t);
    expect(exp - iat).toBe(60);
    const clock = spyOn(Date, "now");
    try {
      clock.mockReturnValue(start + 45 * day);
      const refreshed = await t.mutation(api.nativeAuth.refreshSession, {
        refreshToken: tokens.refreshToken,
      });
      if (refreshed.kind !== "rotated") throw new Error("Refresh failed.");
      expect(
        Math.abs(
          refreshed.tokens.refreshTokenExpiresAt - tokens.refreshTokenExpiresAt,
        ),
      ).toBeLessThan(1);
      clock.mockReturnValue(start + 90 * day + 1000);
      expect(
        await t.mutation(api.nativeAuth.refreshSession, {
          refreshToken: refreshed.tokens.refreshToken,
        }),
      ).toEqual({ kind: "noSession" });
    } finally {
      clock.mockRestore();
    }
  });
});

describe("MCP key compatibility", () => {
  test("existing clients keep their access and rate limit, and only the owner can revoke", async () => {
    const { t, keyId } = await setup();
    const owner = await finishEmail(t);
    const other = await finishEmail(t, "other@example.test");
    const listArgs = { offset: 0, limit: 20 };
    const listed = await owner.actor.action(
      api.nativeAccount.listKeys,
      listArgs,
    );
    expect(listed).toEqual({
      total: 1,
      apiKeys: [
        {
          id: keyId,
          name: "Existing client",
          start: "ritodo",
          expiresAt: expect.any(Number),
        },
      ],
    });
    expect(
      await other.actor.action(api.nativeAccount.listKeys, listArgs),
    ).toMatchObject({ total: 0 });
    await expect(
      other.actor.mutation(api.nativeAccount.revokeKey, { keyId }),
    ).rejects.toThrow("API key not found");
    const accepted = await callMcp(t, legacyKey);
    expect(accepted.status).toBe(200);
    expect(await accepted.text()).toContain("Legacy owned");
    expect((await callMcp(t, legacyKey)).status).toBe(401);

    const now = Date.now();
    const clock = spyOn(Date, "now");
    try {
      clock.mockReturnValue(now + 60_001);
      expect((await callMcp(t, legacyKey)).status).toBe(200);
      clock.mockReturnValue(now + 90 * day + 1000);
      expect((await callMcp(t, legacyKey)).status).toBe(401);
      clock.mockReturnValue(now + 120_002);
      await owner.actor.mutation(api.nativeAccount.revokeKey, { keyId });
      expect((await callMcp(t, legacyKey)).status).toBe(401);
    } finally {
      clock.mockRestore();
    }
  });

  test("native-only accounts create keys, and keys grant MCP access only", async () => {
    const { t } = await setup();
    const { actor, tokens } = await finishEmail(t, "native@example.test");
    await actor.mutation(api.mutations.todoLists.create, {
      title: "Native list",
      kind: "regular",
    });
    const { key } = await actor.mutation(api.nativeAccount.createKey, {
      name: "New client",
    });
    expect(key.startsWith("ritodo_")).toBe(true);
    const accepted = await callMcp(t, key);
    expect(accepted.status).toBe(200);
    expect(await accepted.text()).toContain("Native list");
    await expect(
      t
        .withIdentity({ subject: key })
        .mutation(api.nativeAccount.createKey, { name: "Forbidden" }),
    ).rejects.toThrow("signed in");
    await t.mutation(api.nativeAuth.signOut, {
      refreshToken: tokens.refreshToken,
    });
    expect(await actor.query(api.nativeAuth.isAuthenticated, {})).toBe(false);
    expect((await callMcp(t, key)).status).toBe(200);
  });
});
describe("reviewed identity links", () => {
  test("preview is read-only; gated application preserves legacy data and is idempotent", async () => {
    const { t, authUser, userId, owned } = await setup({
      linked: false,
    });
    await t.run((ctx) =>
      ctx.db.insert("users", {
        betterAuthId: authUser._id,
        email: testEmail,
        updatedAt: Date.now(),
      }),
    );
    const pair = { clerkId: "user_legacy_marko", betterAuthId: authUser._id };
    const preview = await t.query(internal.system.identityLinks.preview, pair);
    expect(preview.status).toBe("ready");
    expect(
      (await t.run((ctx) => ctx.db.get(userId)))?.betterAuthId,
    ).toBeUndefined();
    const args = {
      ...pair,
      legacyUserId: userId,
      newProfileId: preview.newProfileId,
      legacyUpdatedAt: preview.legacyUpdatedAt!,
      newProfileUpdatedAt: preview.newProfileUpdatedAt,
      reviewedBy: "Fixture reviewer",
      evidenceReference: "fixture:independent-dual-identity-proof",
      confirmation: "LINK_VERIFIED_IDENTITIES" as const,
    };
    delete process.env.AUTH_IDENTITY_LINKING_ENABLED;
    await expect(
      t.mutation(internal.system.identityLinks.apply, args),
    ).rejects.toThrow("disabled");
    process.env.AUTH_IDENTITY_LINKING_ENABLED = "true";
    try {
      expect(await t.mutation(internal.system.identityLinks.apply, args)).toBe(
        userId,
      );
      expect(await t.mutation(internal.system.identityLinks.apply, args)).toBe(
        userId,
      );
      const { actor } = await finishEmail(t);
      expect(await actor.query(api.queries.todoLists.list)).toHaveLength(2);
      await expect(
        t.mutation(internal.mutations.todoLists.createForUser, {
          userId: `better-auth:${authUser._id}`,
          title: "Stale MCP request",
          kind: "regular",
        }),
      ).rejects.toThrow("identity changed");
      expect((await t.run((ctx) => ctx.db.get(owned)))?.userId).toBe(
        pair.clerkId,
      );
      expect(
        await t.run((ctx) => ctx.db.get(preview.newProfileId!)),
      ).toBeNull();
      expect(
        await t.run((ctx) =>
          ctx.db
            .query("identityLinks")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", pair.clerkId))
            .take(2),
        ),
      ).toHaveLength(1);
    } finally {
      delete process.env.AUTH_IDENTITY_LINKING_ENABLED;
    }
  });

  test("new ownership, membership or invite creation blocks linking", async () => {
    for (const conflict of ["list", "membership", "invite"] as const) {
      const { t, authUser, owned } = await setup({ linked: false });
      const newOwner = `better-auth:${authUser._id}`;
      await t.run(async (ctx) => {
        if (conflict === "list")
          await ctx.db.patch(owned, { userId: newOwner });
        if (conflict === "membership")
          await ctx.db.insert("todoListUsers", {
            listId: owned,
            userId: newOwner,
          });
        if (conflict === "invite")
          await ctx.db.insert("todoListInvites", {
            listId: owned,
            token: "new-invite",
            expiresAt: Date.now() + 1000,
            createdByUserId: newOwner,
          });
      });
      expect(
        (
          await t.query(internal.system.identityLinks.preview, {
            clerkId: "user_legacy_marko",
            betterAuthId: authUser._id,
          })
        ).status,
      ).toBe("blocked");
    }
  });

  test("stale review and conflicting mappings cannot overwrite an identity", async () => {
    const { t, authUser, userId } = await setup({ linked: false });
    const pair = { clerkId: "user_legacy_marko", betterAuthId: authUser._id };
    const preview = await t.query(internal.system.identityLinks.preview, pair);
    const args = {
      ...pair,
      legacyUserId: userId,
      newProfileId: preview.newProfileId,
      legacyUpdatedAt: preview.legacyUpdatedAt!,
      newProfileUpdatedAt: preview.newProfileUpdatedAt,
      reviewedBy: "Fixture reviewer",
      evidenceReference: "fixture:proof",
      confirmation: "LINK_VERIFIED_IDENTITIES" as const,
    };
    await t.run((ctx) =>
      ctx.db.patch(userId, { updatedAt: preview.legacyUpdatedAt! + 1 }),
    );
    process.env.AUTH_IDENTITY_LINKING_ENABLED = "true";
    try {
      await expect(
        t.mutation(internal.system.identityLinks.apply, args),
      ).rejects.toThrow("changed after review");
      await t.run((ctx) =>
        ctx.db.patch(userId, { betterAuthId: "another-identity" }),
      );
      expect(
        (await t.query(internal.system.identityLinks.preview, pair)).status,
      ).toBe("blocked");
      await expect(
        t.mutation(internal.system.identityLinks.apply, args),
      ).rejects.toThrow("already linked");
    } finally {
      delete process.env.AUTH_IDENTITY_LINKING_ENABLED;
    }
  });
});

describe("Clerk MCP fallback", () => {
  test("Clerk keys keep their legacy identity during the transition", async () => {
    const { t } = await setup();
    const previous = process.env.CLERK_SECRET_KEY;
    process.env.CLERK_SECRET_KEY = "sk_test_fixture_only";
    try {
      const clerk = mock(async () => ({ subject: "user_legacy_marko" }));
      const result = await t.action(async (ctx) => {
        const auth = await authenticateMcpRequest(
          ctx,
          new Request("https://auth.example.test/mcp", {
            headers: { Authorization: "Bearer clerk_fixture_key" },
          }),
          clerk,
        );
        return auth.authenticated ? auth.userId : null;
      });
      expect(result).toBe("user_legacy_marko");
      expect(clerk).toHaveBeenCalledTimes(1);
    } finally {
      if (previous === undefined) delete process.env.CLERK_SECRET_KEY;
      else process.env.CLERK_SECRET_KEY = previous;
    }
  });
});

describe("Clerk webhook", () => {
  test("syncs a signed user event and rejects a tampered body", async () => {
    const { t } = await setup();
    const secret = `whsec_${btoa("test-only-webhook-secret")}`;
    process.env.CLERK_WEBHOOK_SECRET = secret;
    try {
      const body = JSON.stringify({
        type: "user.created",
        data: {
          id: "user_webhook_new",
          email_addresses: [
            { id: "email_1", email_address: "new@example.test" },
          ],
          primary_email_address_id: "email_1",
          first_name: "New",
          last_name: null,
          image_url: null,
        },
      });
      const signed = (payload: string) => ({
        method: "POST",
        headers: {
          "svix-id": "msg_test",
          "svix-timestamp": String(Math.floor(Date.now() / 1000)),
          "svix-signature": new Webhook(secret).sign(
            "msg_test",
            new Date(),
            body,
          ),
        },
        body: payload,
      });

      const tampered = await t.fetch(
        "/clerk-webhook",
        signed(body.replace("new@", "attacker@")),
      );
      expect(tampered.status).toBe(400);

      const accepted = await t.fetch("/clerk-webhook", signed(body));
      expect(accepted.status).toBe(200);
      expect(
        await t.run((ctx) =>
          ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) =>
              q.eq("clerkId", "user_webhook_new"),
            )
            .unique(),
        ),
      ).toMatchObject({ email: "new@example.test", firstName: "New" });
    } finally {
      delete process.env.CLERK_WEBHOOK_SECRET;
    }
  });
});
