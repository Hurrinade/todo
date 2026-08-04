import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

import {
  todoNoteContentValidator,
  todoTitleContentValidator,
} from "./shared/todo";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    imageUrl: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_clerk_id", ["clerkId"]),
  todoLists: defineTable({
    title: v.string(),
    emoji: v.optional(v.string()),
    kind: v.union(v.literal("regular"), v.literal("sectioned")),
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
    .index("by_list_id", ["listId"]),
  todos: defineTable({
    listId: v.id("todoLists"),
    sectionId: v.optional(v.id("todoSections")),
    title: todoTitleContentValidator,
    description: v.optional(todoNoteContentValidator),
    isCompleted: v.boolean(),
    completedAt: v.optional(v.number()),
    order: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_list_id", ["listId"])
    .index("by_list_id_and_completed", ["listId", "isCompleted"])
    .index("by_section_id", ["sectionId"])
    .index("by_section_id_and_completed", ["sectionId", "isCompleted"]),
});
