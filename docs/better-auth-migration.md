# Better Auth migration

Local work only. Started from clean HEAD `4c8f47d` on the isolated
`auth/better-auth-migration` worktree. The original checkout remains on
`fix/smooth-drag-and-drop`. Nothing has been deployed, no data has been migrated,
and no authentication dashboards or environment files were inspected.

## Implemented

- Convex's `@convex-dev/better-auth` component, React provider and Vite cross-domain client.
- Compact shadcn dialog, approved option B. Email uses a six-digit sign-in code,
  with a five-minute expiry and three verification attempts. Password auth is disabled.
  A verified code also creates an account for a new email address.
- Google OAuth returns to the page that opened the dialog, including shared-list invites.
- Persistent sessions expire after 30 days and renew after one day of activity.
  Email OTP creates persistent sessions by default and has no `rememberMe` switch.
  The client does not opt out of persistence. The integration stores the session
  in browser local storage for cross-domain requests.
- Profile sync and explicit identity resolution preserve legacy Clerk ownership IDs.

## Blockers before this can be enabled

1. **Email delivery is deliberately disabled.** `sendVerificationOTP` in
   `convex/auth.ts` throws until Marko chooses an email delivery service and a
   verified sender address. It never logs or returns a code. Clerk's managed email
   delivery does not transfer to Better Auth. Wire the sender server-side and test
   delivery in an explicitly approved isolated environment before cutover.
2. **Existing identities need a verified backfill.** No backfill command or public
   account-linking endpoint was added. The procedure below requires reviewed
   identity evidence and explicit approval before touching any real data.
3. Google credentials and the target deployment's callback URL need configuration.
4. A real sign-in, OAuth redirect, reload, renewal and sign-out still need testing
   against an explicitly approved isolated Convex deployment. No Convex CLI commands
   or dashboard actions were performed here.

## URLs and external configuration

Use the same Convex deployment for both public frontend values:

```dotenv
VITE_CONVEX_URL=https://<deployment>.convex.cloud
VITE_CONVEX_SITE_URL=https://<deployment>.convex.site
```

The Vite frontend origin is different from the auth server. The server's `baseURL`
is Convex's built-in `CONVEX_SITE_URL`, and `/api/auth` runs there with CORS enabled.
Both client and server use the integration's cross-domain plugins. There is no
Next.js proxy or SSR helper and no auth endpoint hosted by Vite.

Once Marko identifies the target deployment, the exact Google redirect URI is:

```text
https://<deployment>.convex.site/api/auth/callback/google
```

For each separately approved environment, Marko must:

- Provide the matching public `.cloud` and `.site` URLs above.
- Set server-only `SITE_URL` to the exact Vite app origin, such as
  `http://localhost:5173` for local development. This is the trusted browser origin
  and the cross-domain return destination. Use a separate environment for a different origin.
- Supply a random `BETTER_AUTH_SECRET` with at least 32 bytes of entropy, stored
  only in the Convex server environment. Keep it stable across restarts.
- Provide Google Web application OAuth `GOOGLE_CLIENT_ID` and
  `GOOGLE_CLIENT_SECRET` in the Convex server environment and add the exact redirect
  URI above to that OAuth client's authorized redirect URIs. Vite's origin is not
  the Google callback. `CONVEX_SITE_URL` is supplied by Convex.
- Choose an email service, verified sender address and its server credentials.
  Delivery integration is pending that choice.

No secret belongs in a `VITE_*` variable or a checked-in env file. The literal
deployment hostname remains unknown because credentials and dashboards were not read.

## Legacy data and verified identity backfill

`users.clerkId` remains on existing records. The new optional `users.betterAuthId`
field maps an authenticated Better Auth component user to that legacy record.
The new index is `by_better_auth_id`. No existing document needs rewriting just
to accept this additive schema change.

Authorization validates the Better Auth session, looks up `users.betterAuthId`,
and returns the existing `clerkId` when linked. Otherwise it uses
`better-auth:<Better Auth user ID>`. The new namespace cannot collide with a
Clerk `user_*` ID. An unlinked account cannot see an old account's lists even if
its email matches. Profile triggers never link accounts by email.

Keep these values unchanged for legacy users:

- `todoLists.userId`
- `todoListUsers.userId`
- `todoListInvites.createdByUserId`

Before any live cutover, prepare and approve this backfill separately:

1. Back up the target data and rehearse on an isolated copy. Obtain an authoritative
   one-to-one mapping of Clerk IDs to Better Auth IDs. Require proof of both
   identities, such as a separately reviewed authenticated account-linking flow.
   The current webhook's email field contains no verification evidence, so an
   email-string match alone is insufficient. Never use client-submitted Clerk IDs.
2. Review missing legacy user records, duplicate profiles and conflicting mappings.
   Verify each target Better Auth user exists, is controlled by the intended person,
   and is not already linked elsewhere. If any mapping is ambiguous, stop.
3. In a separately reviewed internal batch mutation, set `betterAuthId` on the
   existing legacy user record. If signup already created a separate profile,
   reconcile that profile in the same transaction. Enforce one-to-one mappings
   in both directions with indexed checks, preserve an audit record and make
   retries idempotent. Do not overwrite an existing mapping.
4. Before merging a new profile, check for lists, memberships and invites under its
   `better-auth:` ID. If any exist, stop for a reviewed reconciliation plan instead
   of hiding that newer data by switching its identity. Do not delete a legacy
   profile or rewrite legacy ownership IDs.
5. Verify owned lists, shared memberships, invite creators and MCP access against
   the same fixtures. Require every legacy user to be accounted for before
   switching web auth. Users must authenticate again after cutover; Clerk sessions
   do not become Better Auth sessions.

Until that backfill is completed, existing data remains stored but will not be
visible to an unlinked Better Auth account. This branch is not ready for live cutover.

## MCP remains on Clerk

`convex/mcp/auth.ts`, its `@clerk/backend` dependency and `CLERK_SECRET_KEY` remain.
MCP still verifies Clerk user API keys and passes their Clerk IDs to internal
functions. The legacy signed `/clerk-webhook` profile sync remains available, with
`svix` and `CLERK_WEBHOOK_SECRET`, so Clerk-side profile updates still work.
Clerk web JWT trust and `@clerk/react` have been removed.

The new account menu shows identity and sign-out. Clerk's profile and API-key
management UI is no longer embedded. Migrating MCP keys and replacing key
management are separate work; do not remove the remaining Clerk backend setup yet.
New Better Auth-only users do not automatically gain Clerk MCP keys.

## Package compatibility and local verification

Better Auth uses the patched `~1.6.33` line within the component's supported
`>=1.6.11 <1.7.0` peer range. The component's published React provider type incorrectly
infers session data as `never` with patched Better Auth releases. A single
`@ts-expect-error` marks that prop boundary, without changing the inferred client
types elsewhere. Remove it when [upstream issue 420](https://github.com/convex/better-auth/issues/420)
is fixed. Do not downgrade below security patches to silence this error.

`convex/_generated/api.d.ts` was updated locally to reference the package's exported
`ComponentApi<"betterAuth">` and the new auth module. No remote code generation was
run. Regenerate and compare it when an isolated deployment is explicitly authorized.

The in-memory tests run with `bun test tests/auth.test.ts`. They test mapped legacy
access, isolation of an unlinked matching email, expired sessions, profile sync,
HTTP session renewal after one day and the unchanged Clerk-ID MCP query path.
They do not connect to Convex or send email.
After rebasing onto current `main`, `bun run check` uses oxlint and TypeScript 7
to check lint and frontend/backend types. The build was run through
Vite's JavaScript API with `envDir: false`, so no env files were read.
The browser preview request was rejected, so browser interaction testing is still pending.

## Official references

- [Convex React and Vite integration](https://labs.convex.dev/better-auth/framework-guides/react)
- [Convex auth triggers](https://labs.convex.dev/better-auth/features/triggers)
- [Supported plugins](https://labs.convex.dev/better-auth/supported-plugins)
- [Email OTP](https://better-auth.com/docs/plugins/email-otp)
- [Session expiration and renewal](https://better-auth.com/docs/concepts/session-management)
- [Google OAuth](https://better-auth.com/docs/authentication/google)
