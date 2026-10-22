import { describe, expect, test } from "bun:test";
import { convexTest } from "convex-test";
import { resolve } from "node:path";

import { api, components, internal } from "../convex/_generated/api";
import schema from "../convex/schema";
import { syncBetterAuthUser } from "../convex/system/users";
import betterAuthSchema from "../node_modules/@convex-dev/better-auth/src/component/schema";

// Test-process values only. No environment files or external services are used.
process.env.SITE_URL = "http://localhost:5173";
process.env.CONVEX_SITE_URL = "https://auth.example.test";
process.env.BETTER_AUTH_SECRET =
  "test-only-secret-not-for-use-outside-tests-123456789";
process.env.GOOGLE_CLIENT_ID = "test-only-client";
process.env.GOOGLE_CLIENT_SECRET = "test-only-secret";
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
    modulesIn("node_modules/@convex-dev/better-auth/src/component"),
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

describe("Better Auth ownership mapping", () => {
  test("HTTP session use renews to 30 days after the daily update age", async () => {
    const { t } = await setup({ age: 86400000 * 2 });
    const request = {
      headers: {
        Authorization: "Bearer test-session",
        Origin: "http://localhost:5173",
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
