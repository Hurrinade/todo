import { defineSchema } from "convex/server";
import { tables } from "./generatedSchema";

export default defineSchema({
  ...tables,
  apikey: tables.apikey
    .index("key", ["key"])
    .index("referenceId", ["referenceId"])
    .index("expiresAt", ["expiresAt"]),
});
