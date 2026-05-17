import {
  mutation as rawMutation,
  internalMutation as rawInternalMutation,
} from "../_generated/server";
import type { DataModel } from "../_generated/dataModel";
import { Triggers } from "convex-helpers/server/triggers";
import {
  customCtx,
  customMutation,
} from "convex-helpers/server/customFunctions";

// start using Triggers, with table types from schema.ts
const triggers = new Triggers<DataModel>();

// register a function to run when a `ctx.db.insert`, `ctx.db.patch`, `ctx.db.replace`, or `ctx.db.delete` changes the "todoLists" table
triggers.register("todoLists", async (ctx, change) => {
  if (change.operation === "insert") {
    const newList = change.newDoc;
    await ctx.db.insert("todoListUsers", {
      listId: newList._id,
      userId: newList.userId,
    });
  }

  if (change.operation === "delete") {
    const oldList = change.oldDoc;

    // Const delete all related todos
    const todos = await ctx.db
      .query("todos")
      .withIndex("by_list_id", (q) => q.eq("listId", oldList._id))
      .collect();

    for (const todo of todos) {
      await ctx.db.delete(todo._id);
    }

    // Delete all related todo list users
    const todoListUsers = await ctx.db
      .query("todoListUsers")
      .withIndex("by_list_id", (q) => q.eq("listId", oldList._id))
      .collect();

    for (const todoListUser of todoListUsers) {
      await ctx.db.delete(todoListUser._id);
    }
  }
});

// create wrappers that replace the built-in `mutation` and `internalMutation`
// the wrappers override `ctx` so that `ctx.db.insert`, `ctx.db.patch`, etc. run registered trigger functions
export const mutation = customMutation(rawMutation, customCtx(triggers.wrapDB));
export const internalMutation = customMutation(
  rawInternalMutation,
  customCtx(triggers.wrapDB),
);
