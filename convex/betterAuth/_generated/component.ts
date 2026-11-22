/* eslint-disable */
/**
 * Generated `ComponentApi` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type { FunctionReference } from "convex/server";

/**
 * A utility for referencing a Convex component's exposed API.
 *
 * Useful when expecting a parameter like `components.myComponent`.
 * Usage:
 * ```ts
 * async function myFunction(ctx: QueryCtx, component: ComponentApi) {
 *   return ctx.runQuery(component.someFile.someQuery, { ...args });
 * }
 * ```
 */
export type ComponentApi<Name extends string | undefined = string | undefined> =
  {
    accounts: {
      byGoogleSubject: FunctionReference<
        "query",
        "internal",
        { subject: string },
        {
          email: string;
          emailVerified: boolean;
          id: string;
          image?: string;
          name: string;
        } | null,
        Name
      >;
      byId: FunctionReference<
        "query",
        "internal",
        { id: string },
        {
          email: string;
          emailVerified: boolean;
          id: string;
          image?: string;
          name: string;
        } | null,
        Name
      >;
      byVerifiedEmail: FunctionReference<
        "query",
        "internal",
        { email: string },
        {
          email: string;
          emailVerified: boolean;
          id: string;
          image?: string;
          name: string;
        } | null,
        Name
      >;
    };
    keys: {
      claimKey: FunctionReference<
        "mutation",
        "internal",
        { hash: string },
        string | null,
        Name
      >;
      createKey: FunctionReference<
        "mutation",
        "internal",
        { name: string; owner: string },
        { key: string },
        Name
      >;
      listKeys: FunctionReference<
        "query",
        "internal",
        {
          owner: string;
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
        },
        {
          continueCursor: string;
          isDone: boolean;
          page: Array<{
            expiresAt: number | null;
            id: string;
            name: string | null;
            start: string | null;
          }>;
          pageStatus?: "SplitRecommended" | "SplitRequired" | null;
          splitCursor?: string | null;
        },
        Name
      >;
      revokeKey: FunctionReference<
        "mutation",
        "internal",
        { keyId: string; owner: string },
        boolean,
        Name
      >;
    };
  };
