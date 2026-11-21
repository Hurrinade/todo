import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { mcpKeySummary } from "../shared/mcpKeys";

export const googleOwner = query({
  args: { subject: v.string() },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, { subject }) => {
    const account = await ctx.db
      .query("account")
      .withIndex("accountId_providerId", (q) =>
        q.eq("accountId", subject).eq("providerId", "google"),
      )
      .unique();
    return account?.userId ?? null;
  },
});

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
