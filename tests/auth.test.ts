import { describe, expect, mock, spyOn, test } from "bun:test";
import { Resend, type EmailId } from "@convex-dev/resend";
import { convexTest } from "convex-test";
import { resolve } from "node:path";
import { z } from "zod";

import { api, components, internal } from "../convex/_generated/api";
import schema from "../convex/schema";
import { syncBetterAuthUser } from "../convex/system/users";
import betterAuthSchema from "../convex/betterAuth/schema";
import { authenticateMcpRequest } from "../convex/mcp/auth";

// Test-process values only. No environment files or external services are used.
process.env.SITE_URL = "http://localhost:5174";
process.env.CONVEX_SITE_URL = "https://auth.example.test";
process.env.BETTER_AUTH_SECRET =
  "test-only-secret-not-for-use-outside-tests-123456789";
process.env.GOOGLE_CLIENT_ID = "test-only-client";
process.env.GOOGLE_CLIENT_SECRET = "test-only-secret";
process.env.RESEND_API_KEY = "re_test_only_not_a_real_key";
process.env.AUTH_EMAIL_FROM = "RiTodo <login@rinadely.com>";
const { requireAppUserId } = await import("../convex/shared/auth");

// Bun supplies the module glob without starting Vite or reading environment files.
function modulesIn(directory: string) {
  return Object.fromEntries(
    [...new Bun.Glob("**/*.{ts,js}").scanSync({ cwd: directory })]
      .filter((file) => !file.endsWith(".d.ts"))
      .map((file) => [
        `${directory}/${file}`,
        () => import(resolve(directory, file)),
      ]),
  );
}

async function setup({ linked = true, expired = false, age = 0 } = {}) {
  const t = convexTest(schema, modulesIn("convex"));
  t.registerComponent(
    "betterAuth",
    betterAuthSchema,
    modulesIn("convex/betterAuth"),
  );
  const now = Date.now();
  const authUser = await t.run((ctx) =>
    ctx.runMutation(components.betterAuth.adapter.create, {
      input: {
        model: "user",
        data: {
          email: "marko@example.test",
          name: "Marko",
          emailVerified: true,
          createdAt: now,
          updatedAt: now,
        },
      },
    }),
  );
  const session = await t.run((ctx) =>
    ctx.runMutation(components.betterAuth.adapter.create, {
      input: {
        model: "session",
        data: {
          userId: authUser._id,
          token: "test-session",
          expiresAt: expired ? now - 1 : now + 86400000 * 30 - age,
          createdAt: now - age,
          updatedAt: now - age,
        },
      },
    }),
  );
  const ids = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      clerkId: "user_legacy_marko",
      ...(linked ? { betterAuthId: authUser._id } : {}),
      email: "marko@example.test",
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
      userId: "user_someone_else",
      openTodoCount: 0,
      completedTodoCount: 0,
      memberCount: 2,
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
      expiresAt: now + 86400000,
    });
    return { userId, owned, shared, invite };
  });
  return {
    t,
    signedIn: t.withIdentity({ subject: authUser._id, sessionId: session._id }),
    authUser,
    ...ids,
  };
}

function authRequest(body?: object, token = "test-session") {
  return {
    method: body ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      Origin: "http://localhost:5174",
      "Better-Auth-Cookie": "",
      Authorization: `Bearer ${token}`,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  };
}

describe("MCP keys", () => {
  test("another user cannot manage a key, and an expired key cannot authenticate", async () => {
    const { t } = await setup();
    const created = await t.fetch(
      "/api/auth/api-key/create",
      authRequest({ name: "Private" }),
    );
    const key = z
      .object({ id: z.string(), key: z.string() })
      .parse(await created.json());
    await t.run(async (ctx) => {
      const now = Date.now();
      const stranger = await ctx.runMutation(
        components.betterAuth.adapter.create,
        {
          input: {
            model: "user",
            data: {
              email: "other@example.test",
              name: "Other",
              emailVerified: true,
              createdAt: now,
              updatedAt: now,
            },
          },
        },
      );
      await ctx.runMutation(components.betterAuth.adapter.create, {
        input: {
          model: "session",
          data: {
            userId: stranger._id,
            token: "other-session",
            createdAt: now,
            updatedAt: now,
            expiresAt: now + 86400000,
          },
        },
      });
    });
    expect(
      (
        await t.fetch(
          "/api/auth/api-key/delete",
          authRequest({ keyId: key.id }, "other-session"),
        )
      ).status,
    ).toBe(404);
    const listed = await t.fetch(
      "/api/auth/api-key/list",
      authRequest(undefined, "other-session"),
    );
    expect((await listed.json()).apiKeys).toEqual([]);
    await t.run((ctx) =>
      ctx.runMutation(components.betterAuth.adapter.updateOne, {
        input: {
          model: "apikey",
          where: [{ field: "_id", value: key.id }],
          update: { expiresAt: Date.now() - 1 },
        },
      }),
    );
    const response = await t.fetch("/mcp", {
      headers: { Authorization: `Bearer ${key.key}` },
    });
    expect(response.status).toBe(401);
  });

  test("a new key accesses mapped legacy lists, stays hashed and is revocable", async () => {
    const { t, authUser } = await setup();
    const created = await t.fetch(
      "/api/auth/api-key/create",
      authRequest({ name: "Codex" }),
    );
    expect(created.status).toBe(200);
    const key = z
      .object({
        id: z.string(),
        key: z.string(),
        expiresAt: z.union([z.string(), z.number()]),
      })
      .parse(await created.json());
    expect(key.key.startsWith("ritodo_")).toBe(true);
    expect(
      Math.abs(new Date(key.expiresAt).getTime() - Date.now() - 86400000 * 90),
    ).toBeLessThan(5000);
    const stored = await t.run((ctx) =>
      ctx.runQuery(components.betterAuth.adapter.findOne, {
        model: "apikey",
        where: [{ field: "_id", value: key.id }],
      }),
    );
    expect(stored?.key).not.toBe(key.key);
    expect(stored?.referenceId).toBe(authUser._id);
    const listed = await t.fetch("/api/auth/api-key/list", authRequest());
    expect(listed.status).toBe(200);
    const list = await listed.json();
    expect(list.apiKeys).toHaveLength(1);
    expect(list.apiKeys[0].key).toBeUndefined();
    const request = () =>
      t.fetch("/mcp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
          Authorization: `Bearer ${key.key}`,
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: { name: "list_todo_lists", arguments: {} },
        }),
      });
    const response = await request();
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.result.isError).not.toBe(true);
    expect(JSON.parse(result.result.content[0].text).lists).toHaveLength(2);
    // API keys cannot act as account-management browser sessions.
    const elevated = await t.fetch(
      "/api/auth/api-key/create",
      authRequest({ name: "Forbidden" }, key.key),
    );
    expect(elevated.status).toBe(401);
    const revoked = await t.fetch(
      "/api/auth/api-key/delete",
      authRequest({ keyId: key.id }),
    );
    expect(revoked.status).toBe(200);
    expect((await request()).status).toBe(401);
  });

  test("keys cannot claim another identity, survive deletion, or choose a foreign prefix", async () => {
    const { t, authUser } = await setup({ linked: false });
    const forged = await t.fetch(
      "/api/auth/api-key/create",
      authRequest({ name: "Forged", userId: "user_legacy_marko" }),
    );
    expect(forged.status).toBe(401);
    const prefix = await t.fetch(
      "/api/auth/api-key/create",
      authRequest({ name: "Wrong prefix", prefix: "clerk_" }),
    );
    expect(prefix.status).toBe(400);
    const created = await t.fetch(
      "/api/auth/api-key/create",
      authRequest({ name: "Codex" }),
    );
    expect(created.status).toBe(200);
    const key = z
      .object({ id: z.string(), key: z.string() })
      .parse(await created.json());
    const clerk = mock(async () => ({ subject: "user_legacy_marko" }));
    const authenticate = () =>
      t.action(async (ctx) => {
        const result = await authenticateMcpRequest(
          ctx,
          new Request("https://auth.example.test/mcp", {
            headers: { Authorization: `Bearer ${key.key}` },
          }),
          clerk,
        );
        return result.authenticated ? result.userId : null;
      });
    expect(await authenticate()).toBe(`better-auth:${authUser._id}`);
    await t.run((ctx) =>
      ctx.runMutation(components.betterAuth.adapter.deleteOne, {
        input: {
          model: "user",
          where: [{ field: "_id", value: authUser._id }],
        },
      }),
    );
    expect(await authenticate()).toBeNull();
    expect(clerk).not.toHaveBeenCalled();
  });

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

describe("reviewed identity links", () => {
  test("preview is read-only; gated application preserves legacy data and is idempotent", async () => {
    const { t, signedIn, authUser, userId, owned } = await setup({
      linked: false,
    });
    await t.run((ctx) => syncBetterAuthUser(ctx, authUser));
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
      expect(await signedIn.query(api.queries.todoLists.list)).toHaveLength(2);
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

describe("Better Auth ownership mapping", () => {
  test("profile edits sync without changing ownership and reject an email overwrite", async () => {
    const { t, userId } = await setup();
    const updated = await t.fetch(
      "/api/auth/update-user",
      authRequest({ name: "Marko Updated" }),
    );
    expect(updated.status).toBe(200);
    await t.mutation(internal.system.users.syncFromClerk, {
      clerkId: "user_legacy_marko",
      email: "old-email@example.test",
      firstName: "Old",
    });
    expect(await t.run((ctx) => ctx.db.get(userId))).toMatchObject({
      clerkId: "user_legacy_marko",
      firstName: "Marko",
      lastName: "Updated",
    });
    const forged = await t.fetch(
      "/api/auth/update-user",
      authRequest({ email: "attacker@example.test" }),
    );
    expect(forged.status).toBe(400);
    expect((await t.run((ctx) => ctx.db.get(userId)))?.email).toBe(
      "marko@example.test",
    );
  });

  test("Google sign-in without credentials returns an actionable error", async () => {
    const { t } = await setup();
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    try {
      const response = await t.fetch("/api/auth/sign-in/social", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost:5174",
          "Better-Auth-Cookie": "",
        },
        body: JSON.stringify({
          provider: "google",
          callbackURL: "http://localhost:5174/",
          disableRedirect: true,
        }),
      });
      expect(response.status).toBe(503);
      expect(await response.json()).toMatchObject({
        message: "Google sign-in is unavailable. Continue with email.",
      });
    } finally {
      process.env.GOOGLE_CLIENT_ID = "test-only-client";
      process.env.GOOGLE_CLIENT_SECRET = "test-only-secret";
    }
  });

  test("configured Google sign-in generates the Convex callback URL", async () => {
    const { t } = await setup();
    const response = await t.fetch("/api/auth/sign-in/social", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:5174",
        "Better-Auth-Cookie": "",
      },
      body: JSON.stringify({
        provider: "google",
        callbackURL: "http://localhost:5174/invite/test-invite",
        disableRedirect: true,
      }),
    });
    expect(response.status).toBe(200);
    const result = z
      .object({ url: z.string(), redirect: z.boolean() })
      .parse(await response.json());
    const url = new URL(result.url);
    expect(url.origin).toBe("https://accounts.google.com");
    expect(url.searchParams.get("client_id")).toBe("test-only-client");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://auth.example.test/api/auth/callback/google",
    );
    expect(result.redirect).toBe(false);
  });

  test("email OTP signs in with a persistent session through the Resend callback", async () => {
    const { t } = await setup();
    // Mock the component client before any auth requests. No emails or network calls.
    const sendEmail = spyOn(Resend.prototype, "sendEmail").mockResolvedValue(
      "test-email-id" as EmailId,
    );
    const headers = {
      "Content-Type": "application/json",
      Origin: "http://localhost:5174",
      "Better-Auth-Cookie": "",
    };
    try {
      const sent = await t.fetch("/api/auth/email-otp/send-verification-otp", {
        method: "POST",
        headers,
        body: JSON.stringify({ email: "new@example.test", type: "sign-in" }),
      });
      expect(sent.status).toBe(200);
      expect(sendEmail).toHaveBeenCalledTimes(1);
      const message = z
        .object({
          from: z.string(),
          to: z.string(),
          subject: z.string(),
          text: z.string(),
        })
        .parse(sendEmail.mock.calls[0]?.[1]);
      expect(message.from).toBe("RiTodo <login@rinadely.com>");
      expect(message.to).toBe("new@example.test");
      expect(message.subject).toBe("Your RiTodo sign-in code");
      const otp = message.text.match(/\b[0-9]{6}\b/)?.[0];
      expect(otp).toBeDefined();
      expect(await sent.text()).not.toContain(otp!);
      const verifyRequest = {
        method: "POST",
        headers,
        body: JSON.stringify({ email: "new@example.test", otp }),
      };
      const signedIn = await t.fetch(
        "/api/auth/sign-in/email-otp",
        verifyRequest,
      );
      expect(signedIn.status).toBe(200);
      const user = z
        .object({
          token: z.string(),
          user: z.object({ emailVerified: z.boolean() }),
        })
        .parse(await signedIn.json());
      expect(user.user.emailVerified).toBe(true);
      expect(signedIn.headers.get("set-better-auth-cookie")).toContain(
        "Max-Age=2592000",
      );
      const session = await t.fetch("/api/auth/get-session", {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const data = await session.json();
      expect(
        Math.abs(
          new Date(data.session.expiresAt).getTime() -
            Date.now() -
            86400000 * 30,
        ),
      ).toBeLessThan(5000);
      const replay = await t.fetch(
        "/api/auth/sign-in/email-otp",
        verifyRequest,
      );
      expect(replay.status).toBe(400);
    } finally {
      sendEmail.mockRestore();
    }
  });

  test("missing email configuration fails before queueing delivery", async () => {
    const { t } = await setup();
    const sendEmail = spyOn(Resend.prototype, "sendEmail");
    const logError = spyOn(console, "error").mockImplementation(() => {});
    delete process.env.AUTH_EMAIL_FROM;
    try {
      const response = await t.fetch(
        "/api/auth/email-otp/send-verification-otp",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Origin: "http://localhost:5174",
          },
          body: JSON.stringify({ email: "new@example.test", type: "sign-in" }),
        },
      );
      // Better Auth catches delivery errors and returns a generic response.
      expect(response.status).toBe(200);
      expect(sendEmail).not.toHaveBeenCalled();
      expect(logError).toHaveBeenCalled();
    } finally {
      process.env.AUTH_EMAIL_FROM = "RiTodo <login@rinadely.com>";
      sendEmail.mockRestore();
      logError.mockRestore();
    }
  });

  test("HTTP session use renews to 30 days after the daily update age", async () => {
    const { t } = await setup({ age: 86400000 * 2 });
    const request = {
      headers: {
        Authorization: "Bearer test-session",
        Origin: "http://localhost:5174",
      },
    };
    const response = await t.fetch("/api/auth/get-session", request);
    expect(response.status).toBe(200);
    const data = await response.json();
    const expiresAt = new Date(data.session.expiresAt).getTime();
    expect(Math.abs(expiresAt - Date.now() - 86400000 * 30)).toBeLessThan(5000);
    const next = await t.fetch("/api/auth/get-session", request);
    expect(next.status).toBe(200);
    expect((await next.json()).session.updatedAt).toBe(data.session.updatedAt);
  });

  test("a linked identity keeps owned lists, shared membership and invites", async () => {
    const { signedIn, t, owned, shared } = await setup();
    expect(await signedIn.query(api.queries.todoLists.list)).toHaveLength(2);
    await signedIn.mutation(api.mutations.todoLists.rename, {
      listId: owned,
      title: "Renamed",
    });
    const invite = await signedIn.query(api.queries.todoInvites.getByToken, {
      token: "test-invite",
    });
    expect(invite?.isCurrentUserMember).toBe(true);
    expect(invite?.createdByUserId).toBe("user_legacy_marko");
    await expect(
      signedIn.mutation(api.mutations.todoLists.remove, { listId: shared }),
    ).rejects.toThrow();
    expect((await t.run((ctx) => ctx.db.get(owned)))?.userId).toBe(
      "user_legacy_marko",
    );
    // The unchanged MCP internal path still uses Clerk ownership IDs.
    expect(
      await t.query(internal.mcp.queries.listTodoLists, {
        userId: "user_legacy_marko",
      }),
    ).toHaveLength(2);
  });

  test("a matching email cannot claim a legacy account", async () => {
    const { signedIn, owned, authUser } = await setup({ linked: false });
    expect(await signedIn.query(api.queries.todoLists.list)).toEqual([]);
    expect(await signedIn.query(requireAppUserId)).toBe(
      `better-auth:${authUser._id}`,
    );
    await expect(
      signedIn.mutation(api.mutations.todoLists.rename, {
        listId: owned,
        title: "Denied",
      }),
    ).rejects.toThrow();
    const created = await signedIn.mutation(api.mutations.todoLists.create, {
      title: "New",
      kind: "regular",
    });
    expect(created).toBeDefined();
    expect(await signedIn.query(api.queries.todoLists.list)).toHaveLength(1);
  });

  test("expired and signed-out sessions cannot access legacy lists", async () => {
    const { signedIn, t } = await setup({ expired: true });
    await expect(signedIn.query(api.queries.todoLists.list)).rejects.toThrow(
      "You must be signed in.",
    );
    await expect(t.query(api.queries.todoLists.list)).rejects.toThrow(
      "You must be signed in.",
    );
  });

  test("profile sync preserves a verified mapping and never links by email", async () => {
    const { t, authUser, userId } = await setup();
    await t.run((ctx) =>
      syncBetterAuthUser(ctx, { ...authUser, name: "Marko Updated" }),
    );
    expect(await t.run((ctx) => ctx.db.get(userId))).toMatchObject({
      clerkId: "user_legacy_marko",
      betterAuthId: authUser._id,
      lastName: "Updated",
    });
    await t.run((ctx) => syncBetterAuthUser(ctx, { ...authUser, name: "" }));
    expect((await t.run((ctx) => ctx.db.get(userId)))?.lastName).toBe(
      "Updated",
    );
    await t.run((ctx) =>
      syncBetterAuthUser(ctx, { ...authUser, _id: "another-auth-id" }),
    );
    expect(
      await t.run((ctx) =>
        ctx.db
          .query("users")
          .withIndex("by_better_auth_id", (q) =>
            q.eq("betterAuthId", "another-auth-id"),
          )
          .unique(),
      ),
    ).toMatchObject({ email: authUser.email });
    expect(
      (
        await t.run((ctx) =>
          ctx.db
            .query("users")
            .withIndex("by_better_auth_id", (q) =>
              q.eq("betterAuthId", "another-auth-id"),
            )
            .unique(),
        )
      )?.clerkId,
    ).toBeUndefined();
  });
});
