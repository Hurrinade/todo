import { v, type Infer } from "convex/values";
import { components, internal } from "./_generated/api";
import { action, internalQuery, mutation, query } from "./_generated/server";
import { CONVEX_OWNER_PREFIX, getProfile, requireProfile } from "./shared/auth";
import type { Doc } from "./_generated/dataModel";
import { profileNameFields } from "./system/users";
import { appError } from "./shared/errors";
import { mcpKeySummary } from "./shared/mcpKeys";

type KeySummary = Infer<typeof mcpKeySummary>;
const keyPageResult = v.object({
  page: v.array(mcpKeySummary),
  isDone: v.boolean(),
  continueCursor: v.string(),
});

export const me = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({ id: v.id("users"), name: v.string(), email: v.string() }),
  ),
  handler: async (ctx) => {
    const profile = await getProfile(ctx);
    if (!profile) return null;
    return {
      id: profile._id,
      name: [profile.firstName, profile.lastName].filter(Boolean).join(" "),
      email: profile.email,
    };
  },
});

function keyOwner(profile: Doc<"users">) {
  return profile.betterAuthId ?? `${CONVEX_OWNER_PREFIX}${profile._id}`;
}

export const updateName = mutation({
  args: { name: v.string() },
  returns: v.null(),
  handler: async (ctx, { name }) => {
    const profile = await requireProfile(ctx);
    const normalized = name.trim();
    if (!normalized || normalized.length > 100) {
      throw appError("invalid_input", "Enter a name of up to 100 characters.");
    }
    await ctx.db.patch("users", profile._id, {
      ...profileNameFields(normalized),
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const createKey = mutation({
  args: { name: v.string() },
  returns: v.object({ key: v.string() }),
  handler: async (ctx, { name }) => {
    const owner = keyOwner(await requireProfile(ctx));
    name = name.trim();
    if (!name || name.length > 100) {
      throw appError("invalid_input", "Enter a name of up to 100 characters.");
    }
    return ctx.runMutation(components.betterAuth.keys.createKey, {
      owner,
      name,
    });
  },
});

export const revokeKey = mutation({
  args: { keyId: v.string() },
  returns: v.null(),
  handler: async (ctx, { keyId }) => {
    const owner = keyOwner(await requireProfile(ctx));
    if (
      !(await ctx.runMutation(components.betterAuth.keys.revokeKey, {
        owner,
        keyId,
      }))
    ) {
      throw appError("not_found", "API key not found.");
    }
    return null;
  },
});

export const keyPage = internalQuery({
  args: { cursor: v.union(v.string(), v.null()) },
  returns: keyPageResult,
  handler: async (ctx, { cursor }) => {
    const owner = keyOwner(await requireProfile(ctx));
    const { page, isDone, continueCursor } = await ctx.runQuery(
      components.betterAuth.keys.listKeys,
      { owner, paginationOpts: { cursor, numItems: 100 } },
    );
    return { page, isDone, continueCursor };
  },
});

// Keep the settings count and offset pagination while bounding each indexed read.
export const listKeys = action({
  args: { offset: v.number(), limit: v.number() },
  returns: v.object({ apiKeys: v.array(mcpKeySummary), total: v.number() }),
  handler: async (
    ctx,
    { offset, limit },
  ): Promise<{ apiKeys: KeySummary[]; total: number }> => {
    if (
      !Number.isSafeInteger(offset) ||
      offset < 0 ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 100
    ) {
      throw appError("invalid_input", "Invalid API key page.");
    }
    const apiKeys: KeySummary[] = [];
    let total = 0;
    let cursor: string | null = null;
    do {
      const result: Infer<typeof keyPageResult> = await ctx.runQuery(
        internal.nativeAccount.keyPage,
        { cursor },
      );
      apiKeys.push(
        ...result.page.slice(
          Math.max(0, offset - total),
          Math.max(0, offset + limit - total),
        ),
      );
      total += result.page.length;
      cursor = result.isDone ? null : result.continueCursor;
    } while (cursor !== null);
    return { apiKeys, total };
  },
});
