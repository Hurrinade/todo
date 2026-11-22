import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { KEY_PREFIX, hashMcpKey, mcpKeySummary } from "../shared/mcpKeys";

export const listKeys = query({
  args: { owner: v.string(), paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(mcpKeySummary),
  handler: async (ctx, { owner, paginationOpts }) => {
    const page = await ctx.db
      .query("apikey")
      .withIndex("referenceId", (q) => q.eq("referenceId", owner))
      .order("desc")
      .paginate(paginationOpts);
    return {
      ...page,
      page: page.page.map(({ _id, name, start, expiresAt }) => ({
        id: _id,
        name: name ?? null,
        start: start ?? null,
        expiresAt: expiresAt ?? null,
      })),
    };
  },
});

export const revokeKey = mutation({
  args: { owner: v.string(), keyId: v.string() },
  returns: v.boolean(),
  handler: async (ctx, { owner, keyId }) => {
    const id = ctx.db.normalizeId("apikey", keyId);
    const key = id && (await ctx.db.get("apikey", id));
    if (!key || key.referenceId !== owner) return false;

    await ctx.db.delete("apikey", key._id);
    return true;
  },
});

// Store the same hash, owner and policy fields as the old keys.
export const createKey = mutation({
  args: { owner: v.string(), name: v.string() },
  returns: v.object({ key: v.string() }),
  handler: async (ctx, { owner, name }) => {
    const random = crypto.getRandomValues(new Uint8Array(32));
    const key =
      KEY_PREFIX +
      Array.from(random, (byte) => byte.toString(16).padStart(2, "0")).join("");
    const now = Date.now();
    await ctx.db.insert("apikey", {
      configId: "default",
      name,
      start: key.slice(0, 8),
      referenceId: owner,
      prefix: KEY_PREFIX,
      key: await hashMcpKey(key),
      enabled: true,
      expiresAt: now + 90 * 86400000,
      rateLimitEnabled: true,
      rateLimitTimeWindow: 60_000,
      rateLimitMax: 120,
      requestCount: 0,
      remaining: null,
      lastRequest: null,
      createdAt: now,
      updatedAt: now,
    });
    return { key };
  },
});

export const claimKey = mutation({
  args: { hash: v.string() },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, { hash }) => {
    const key = await ctx.db
      .query("apikey")
      .withIndex("key", (q) => q.eq("key", hash))
      .unique();
    const now = Date.now();
    if (
      !key ||
      (key.configId && key.configId !== "default") ||
      key.enabled === false ||
      (key.expiresAt != null && key.expiresAt <= now)
    )
      return null;

    const { rateLimitTimeWindow, rateLimitMax, lastRequest } = key;
    const rateLimit =
      key.rateLimitEnabled !== false &&
      rateLimitTimeWindow != null &&
      rateLimitMax != null;
    const inWindow =
      rateLimit &&
      lastRequest != null &&
      now - lastRequest < rateLimitTimeWindow;
    const count = inWindow ? (key.requestCount ?? 0) : 0;
    if (rateLimit && count >= rateLimitMax) return null;

    // Configured only by the old server. Preserve any existing finite quota.
    let remaining = key.remaining;
    let lastRefillAt = key.lastRefillAt;
    if (remaining != null) {
      if (
        key.refillInterval &&
        key.refillAmount &&
        now - (lastRefillAt ?? key.createdAt) > key.refillInterval
      ) {
        remaining = key.refillAmount;
        lastRefillAt = now;
      }
      if (remaining <= 0) return null;
      remaining--;
    }
    // Convex retries this read and update atomically during concurrent use or revocation.
    await ctx.db.patch("apikey", key._id, {
      ...(rateLimit ? { requestCount: count + 1 } : {}),
      lastRequest: now,
      remaining,
      lastRefillAt,
      updatedAt: now,
    });
    return key.referenceId;
  },
});
