import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

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
    userId: v.string(),
    updatedAt: v.number(),
  }).index("by_user_id", ["userId"]),
  todoListUsers: defineTable({
    listId: v.id("todoLists"),
    userId: v.string(),
  })
    .index("by_user_id", ["userId"])
    .index("by_list_id", ["listId"])
    .index("by_list_id_and_user_id", ["listId", "userId"]),
  todos: defineTable({
    listId: v.id("todoLists"),
    title: v.string(),
    isCompleted: v.boolean(),
    completedAt: v.optional(v.number()),
    order: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_list_id", ["listId"])
    .index("by_list_id_and_completed", ["listId", "isCompleted"]),
});
