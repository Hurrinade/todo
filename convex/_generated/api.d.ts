/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as http from "../http.js";
import type * as mutations_todoInvites from "../mutations/todoInvites.js";
import type * as mutations_todoLists from "../mutations/todoLists.js";
import type * as mutations_todoSections from "../mutations/todoSections.js";
import type * as mutations_todos from "../mutations/todos.js";
import type * as queries_todoInvites from "../queries/todoInvites.js";
import type * as queries_todoLists from "../queries/todoLists.js";
import type * as queries_todoSections from "../queries/todoSections.js";
import type * as queries_todos from "../queries/todos.js";
import type * as shared_auth from "../shared/auth.js";
import type * as shared_todo from "../shared/todo.js";
import type * as system_users from "../system/users.js";
import type * as triggers_todolistFunctions from "../triggers/todolistFunctions.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  http: typeof http;
  "mutations/todoInvites": typeof mutations_todoInvites;
  "mutations/todoLists": typeof mutations_todoLists;
  "mutations/todoSections": typeof mutations_todoSections;
  "mutations/todos": typeof mutations_todos;
  "queries/todoInvites": typeof queries_todoInvites;
  "queries/todoLists": typeof queries_todoLists;
  "queries/todoSections": typeof queries_todoSections;
  "queries/todos": typeof queries_todos;
  "shared/auth": typeof shared_auth;
  "shared/todo": typeof shared_todo;
  "system/users": typeof system_users;
  "triggers/todolistFunctions": typeof triggers_todolistFunctions;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
