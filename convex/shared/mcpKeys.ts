import { v } from "convex/values";

export const mcpKeySummary = v.object({
  id: v.string(),
  name: v.union(v.string(), v.null()),
  start: v.union(v.string(), v.null()),
  expiresAt: v.union(v.number(), v.null()),
});

export const KEY_PREFIX = "ritodo_";

// Existing MCP keys use SHA-256 encoded as unpadded base64url.
export async function hashMcpKey(key: string) {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(key),
  );
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}
