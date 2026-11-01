import { v, type Infer } from "convex/values";
import { authComponent } from "../auth";
import { syncBetterAuthUser } from "./users";
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
  type QueryCtx,
} from "../_generated/server";

const identityPair = { clerkId: v.string(), betterAuthId: v.string() };
const reportValidator = v.object({
  status: v.union(
    v.literal("ready"),
    v.literal("linked"),
    v.literal("blocked"),
  ),
  reason: v.string(),
  legacyUserId: v.union(v.id("users"), v.null()),
  newProfileId: v.union(v.id("users"), v.null()),
  legacyUpdatedAt: v.union(v.number(), v.null()),
  newProfileUpdatedAt: v.union(v.number(), v.null()),
});
type Report = Infer<typeof reportValidator>;

// This checks safety, not identity evidence. An operator must independently verify
// control of both accounts before approving a pair. Email equality is never proof.
async function inspect(
  ctx: QueryCtx | MutationCtx,
  pair: { clerkId: string; betterAuthId: string },
): Promise<Report> {
  const blocked = (reason: string): Report => ({
    status: "blocked",
    reason,
    legacyUserId: null,
    newProfileId: null,
    legacyUpdatedAt: null,
    newProfileUpdatedAt: null,
  });
  if (!pair.clerkId.startsWith("user_"))
    return blocked("A legacy Clerk user ID is required.");
  const authUser = await authComponent.getAnyUserById(ctx, pair.betterAuthId);
  if (!authUser || !authUser.emailVerified)
    return blocked("The target auth user must exist with a verified email.");

  const legacyProfiles = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", pair.clerkId))
    .take(2);
  const targetProfiles = await ctx.db
    .query("users")
    .withIndex("by_better_auth_id", (q) =>
      q.eq("betterAuthId", pair.betterAuthId),
    )
    .take(2);
  if (legacyProfiles.length !== 1 || targetProfiles.length > 1)
    return blocked("Missing or duplicate app profiles require review.");
  const legacy = legacyProfiles[0];
  const target = targetProfiles[0];
  if (legacy.betterAuthId && legacy.betterAuthId !== pair.betterAuthId)
    return blocked("The legacy account is already linked to another identity.");
  if (target?.clerkId && target.clerkId !== pair.clerkId)
    return blocked(
      "The target identity is already linked to another legacy account.",
    );

  const legacyAudit = await ctx.db
    .query("identityLinks")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", pair.clerkId))
    .unique();
  const targetAudit = await ctx.db
    .query("identityLinks")
    .withIndex("by_better_auth_id", (q) =>
      q.eq("betterAuthId", pair.betterAuthId),
    )
    .unique();
  if (
    (legacyAudit && legacyAudit.betterAuthId !== pair.betterAuthId) ||
    (targetAudit && targetAudit.clerkId !== pair.clerkId)
  ) {
    return blocked("A previous identity-link audit conflicts with this pair.");
  }
  const report = {
    legacyUserId: legacy._id,
    newProfileId: target && target._id !== legacy._id ? target._id : null,
    legacyUpdatedAt: legacy.updatedAt,
    newProfileUpdatedAt:
      target && target._id !== legacy._id ? target.updatedAt : null,
  };
  if (legacy.betterAuthId === pair.betterAuthId)
    return {
      ...report,
      status: "linked",
      reason: "This exact pair is already linked.",
    };
  if (legacyAudit || targetAudit)
    return blocked(
      "An audit exists without its mapping. Review before retrying.",
    );

  const newOwner = `better-auth:${pair.betterAuthId}`;
  const [list, membership, invite] = await Promise.all([
    ctx.db
      .query("todoLists")
      .withIndex("by_user_id", (q) => q.eq("userId", newOwner))
      .first(),
    ctx.db
      .query("todoListUsers")
      .withIndex("by_user_id", (q) => q.eq("userId", newOwner))
      .first(),
    ctx.db
      .query("todoListInvites")
      .withIndex("by_created_by_user_id", (q) =>
        q.eq("createdByUserId", newOwner),
      )
      .first(),
  ]);
  if (list || membership || invite)
    return blocked(
      "The new identity has lists, memberships or invites. Reconcile those separately before linking.",
    );
  return {
    ...report,
    status: "ready",
    reason:
      "No data conflicts. Independent identity evidence and explicit approval are still required.",
  };
}

export const preview = internalQuery({
  args: identityPair,
  returns: reportValidator,
  handler: inspect,
});

// Never called on signup or by a browser. Disabled unless an operator explicitly
// enables the maintenance gate after backup, rehearsal and evidence review.
export const apply = internalMutation({
  args: {
    ...identityPair,
    legacyUserId: v.id("users"),
    newProfileId: v.union(v.id("users"), v.null()),
    legacyUpdatedAt: v.number(),
    newProfileUpdatedAt: v.union(v.number(), v.null()),
    reviewedBy: v.string(),
    evidenceReference: v.string(),
    confirmation: v.literal("LINK_VERIFIED_IDENTITIES"),
  },
  returns: v.id("users"),
  handler: async (ctx, args) => {
    if (process.env.AUTH_IDENTITY_LINKING_ENABLED !== "true")
      throw new Error("Identity linking is disabled.");
    const reviewedBy = args.reviewedBy.trim();
    const evidenceReference = args.evidenceReference.trim();
    if (
      reviewedBy.length < 3 ||
      reviewedBy.length > 128 ||
      evidenceReference.length < 3 ||
      evidenceReference.length > 512
    ) {
      throw new Error(
        "A reviewer and reference to independently verified identity evidence are required.",
      );
    }
    const report = await inspect(ctx, args);
    if (report.status === "blocked" || !report.legacyUserId)
      throw new Error(report.reason);
    if (report.legacyUserId !== args.legacyUserId)
      throw new Error("The reviewed legacy profile changed.");
    if (report.status === "linked") return report.legacyUserId;
    if (
      report.newProfileId !== args.newProfileId ||
      report.legacyUpdatedAt !== args.legacyUpdatedAt ||
      report.newProfileUpdatedAt !== args.newProfileUpdatedAt
    ) {
      throw new Error(
        "Profiles changed after review. Run preview and review again.",
      );
    }
    await ctx.db.patch(report.legacyUserId, {
      betterAuthId: args.betterAuthId,
      updatedAt: Date.now(),
    });
    if (report.newProfileId) await ctx.db.delete(report.newProfileId);
    const authUser = await authComponent.getAnyUserById(ctx, args.betterAuthId);
    if (!authUser) throw new Error("The target auth user no longer exists.");
    await syncBetterAuthUser(ctx, authUser);
    await ctx.db.insert("identityLinks", {
      clerkId: args.clerkId,
      betterAuthId: args.betterAuthId,
      legacyUserId: report.legacyUserId,
      ...(report.newProfileId ? { mergedProfileId: report.newProfileId } : {}),
      reviewedBy,
      evidenceReference,
      linkedAt: Date.now(),
    });
    return report.legacyUserId;
  },
});
