import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

import { recipeContentFields, recipeStatusValidator } from "./shared/recipe";
import {
  todoListKindValidator,
  todoNoteContentValidator,
  todoTitleContentValidator,
} from "./shared/todo";

export default defineSchema({
  users: defineTable({
    // Legacy ownership IDs stay unchanged. Linking requires a verified backfill.
    clerkId: v.optional(v.string()),
    betterAuthId: v.optional(v.string()),
    email: v.string(),
    imageUrl: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_better_auth_id", ["betterAuthId"]),
  identityLinks: defineTable({
    clerkId: v.string(),
    betterAuthId: v.string(),
    legacyUserId: v.id("users"),
    mergedProfileId: v.optional(v.string()),
    reviewedBy: v.string(),
    evidenceReference: v.string(),
    linkedAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_better_auth_id", ["betterAuthId"]),
  todoLists: defineTable({
    title: v.string(),
    emoji: v.optional(v.string()),
    kind: todoListKindValidator,
    userId: v.string(),
    order: v.optional(v.number()),
    openTodoCount: v.number(),
    completedTodoCount: v.number(),
    memberCount: v.number(),
    updatedAt: v.number(),
  }).index("by_user_id", ["userId"]),
  todoSections: defineTable({
    listId: v.id("todoLists"),
    title: v.string(),
    order: v.optional(v.number()),
    isDefault: v.boolean(),
    updatedAt: v.number(),
  })
    .index("by_list_id", ["listId"])
    .index("by_list_id_and_default", ["listId", "isDefault"]),
  todoListUsers: defineTable({
    listId: v.id("todoLists"),
    userId: v.string(),
  })
    .index("by_user_id", ["userId"])
    .index("by_list_id", ["listId"])
    .index("by_list_id_and_user_id", ["listId", "userId"]),
  todoListInvites: defineTable({
    listId: v.id("todoLists"),
    token: v.string(),
    createdByUserId: v.string(),
    expiresAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_created_by_user_id", ["createdByUserId"])
    .index("by_list_id", ["listId"]),
  todos: defineTable({
    listId: v.id("todoLists"),
    sectionId: v.optional(v.id("todoSections")),
    title: todoTitleContentValidator,
    description: v.optional(todoNoteContentValidator),
    isCompleted: v.boolean(),
    completedAt: v.optional(v.number()),
    order: v.number(),
    updatedAt: v.number(),
  })
    // The order indexes also serve listId and sectionId prefix lookups.
    .index("by_list_id_completed_and_order", ["listId", "isCompleted", "order"])
    .index("by_list_id_completed_and_completed_at", [
      "listId",
      "isCompleted",
      "completedAt",
    ])
    .index("by_section_id_completed_and_order", [
      "sectionId",
      "isCompleted",
      "order",
    ])
    // Finds expired completed todos across all lists for the retention cron.
    .index("by_completed_and_completed_at", ["isCompleted", "completedAt"]),
  // The saved copy of a recipe list todo. The todo title is the recipe name
  // and its description holds the family's own notes.
  recipes: defineTable({
    listId: v.id("todoLists"),
    todoId: v.id("todos"),
    sourceUrl: v.string(),
    status: recipeStatusValidator,
    errorMessage: v.optional(v.string()),
    imageId: v.optional(v.id("_storage")),
    ...recipeContentFields,
    importedAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_todo_id", ["todoId"])
    .index("by_list_id", ["listId"]),
});
