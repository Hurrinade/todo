import { v } from "convex/values";

export const mcpKeySummary = v.object({
  id: v.string(),
  name: v.union(v.string(), v.null()),
  start: v.union(v.string(), v.null()),
  expiresAt: v.union(v.number(), v.null()),
});
