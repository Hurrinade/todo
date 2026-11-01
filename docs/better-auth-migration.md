# Better Auth migration

Started from clean HEAD `4c8f47d` on the isolated `auth/better-auth-migration`
worktree. The original checkout remains on `fix/smooth-drag-and-drop`.
With Marko's explicit approval, the backend was uploaded to development deployment
`exciting-gazelle-205` on 2026-10-22. Production was not changed.
At that stage, no identity backfill, email send or remote environment-variable change
was performed. No authentication dashboards, `.env.local` or `.env.production`
files were inspected.

On 2026-10-26, the MCP key and gated identity-link backend extensions were also
uploaded to that development deployment. The maintenance gate remained disabled.
Signed-out checks passed: auth health and session endpoints returned 200, while
key listing and MCP returned 401. No remote key or identity record was created.

PR #18 already exists for this branch and links an earlier Vercel preview.
`vercel.json` disables automatic Vercel deployment specifically for
`auth/better-auth-migration`, so publishing review commits does not deploy this
migration branch. The UI follow-up branch `design/auth-account-ui` also disables
automatic Vercel deployment so its review commits do not publish a preview. Other
branch rules and the existing SPA rewrite are unchanged.
Read-only development identity checks began on 2026-10-27. The maintenance gate
is still disabled; verified ownership evidence, backup, rehearsal and approval
are required before applying any mapping. Private account IDs and evidence must
stay outside this repository and the PR.

A private development snapshot was exported with file storage on 2026-10-27.
An isolated in-memory rehearsal using copied application records preserved all
list, section, todo, membership and invite data, restored the candidate legacy
access, removed only the unused duplicate profile and passed an idempotent retry.
This rehearsal does not prove account ownership.
The review also found legacy ownership without an app user profile. Those records
require independent investigation; do not create a guessed profile or rewrite
ownership to fit an email match.

After Marko confirmed his exact legacy Clerk identity, the corresponding verified
Google account was linked on development on 2026-10-27. A fresh private backup
and copied-data rehearsal preceded the single transaction. The legacy profile
and ownership IDs were retained, the unused duplicate app profile was removed,
and an audit record was written. Before/after snapshots confirmed that all lists,
sections, todos, memberships and invites, all other app profiles, and the Better
Auth user records were unchanged. Canonical identity resolution and legacy list
access were verified. The maintenance variable was temporarily enabled for that
operation and then removed, restoring the original disabled state. Production
and every other identity mapping remain untouched.

## Implemented

- Convex's `@convex-dev/better-auth` component, React provider and Vite cross-domain client.
- Wider shadcn sign-in dialog with Google first and an email/send-code row.
  Six code slots verify automatically on completion, with resend and change-email
  controls. Codes expire after five minutes and allow three verification attempts.
  Password auth is disabled. A verified code also creates an account for a new email.
- The official Convex Resend component queues sign-in emails from the server.
  `RESEND_API_KEY` and `AUTH_EMAIL_FROM` supply its credentials and sender.
  The chosen sender is `RiTodo <login@rinadely.com>`. Neither codes nor keys are
  logged or returned to the browser. `testMode: false` permits delivery to real
  inboxes when this code is deployed, including on a development deployment.
- Google OAuth returns to the page that opened the dialog, including shared-list invites.
  Its button uses the unmodified Google-hosted SVG saved in `public/google-g.svg`.
  The asset is served locally and was downloaded from
  `https://fonts.gstatic.com/s/i/productlogos/googleg/v6/24px.svg`.
- Persistent sessions expire after 90 days and renew on use after one day.
  After deployment, new sessions and subsequent renewals use this duration.
  Existing expiration timestamps are unchanged until renewal.
  Email OTP creates persistent sessions by default and has no `rememberMe` switch.
  The client does not opt out of persistence. The integration stores the session
  in browser local storage for cross-domain requests.
- The last successful account email is also stored as a local form preference,
  including Google sessions. It prefills the editable email field after sign-out
  or expiration. Storage restrictions fall back to an empty field. Verification
  is still required for a new session.
- Profile sync and explicit identity resolution preserve legacy Clerk ownership IDs.
- Better Auth's official API-key plugin issues hashed `ritodo_` MCP keys. Keys
  expire after 90 days, allow 120 requests per minute and can be revoked. They
  resolve the same app identity as web sessions, including verified legacy links.
  API keys cannot create browser sessions or manage other keys as a session.
  Existing Clerk keys continue to work during the transition.
- Internal identity-link preview and apply functions, with a disabled-by-default
  maintenance gate, conflict checks, optimistic review snapshots and an audit.
  These are not called by signup or exposed as public account-linking endpoints.
- Responsive account settings use desktop side navigation and full-screen mobile
  tabs, with a name/email header. The auth dialogs and account menu follow the app
  theme, including light, dark and alternate background colors, using existing tokens.
  The account menu opens Settings. Profile supports name editing and shows a
  read-only email. MCP keys supports paginated listing, creation, one-time secret
  copying, expiration details and confirmed revocation, plus the MCP endpoint.
  New-key creation and one-time copying use a separate dialog with a light backdrop.
  The copy step prevents accidental outside-click dismissal.
  TanStack Query handles the key list and mutations without new effects. Its cache
  is scoped to the open dialog; key secrets are only held in component state and
  are discarded on tab changes or closing. Automatic mutation retries are disabled.
  A successful profile save closes Settings. Its backdrop is 20% black without blur.

## Validation and remaining release blockers

Marko confirmed development Google login, email-code delivery and login, new-account
creation, reload, sign-out and profile name editing. Renewal is covered by an
in-memory HTTP test, including returning after 45 days and daily refresh throttling.
Real MCP key creation, use and revocation still need a development check.

One owner-confirmed development identity pair has been linked after backup and
rehearsal. Production identities still require independent evidence and reviewed
mappings. No login or signup links users by email alone.

On 2026-11-01, Marko authorized production identity preparation and a private
snapshot export from `expert-guineapig-443`, including file storage. A read-only
check confirmed the expected deployment URLs, `SITE_URL=https://ritodo.rinadely.com`,
present auth/Google/Resend credentials, the expected sender, and a disabled identity
linking gate. These checks establish presence, not credential validity or Google's
callback allowlist. No credential values were exposed or changed.

The production snapshot has a legacy profile for every owner/member ID and no
duplicate Clerk IDs. It contains no Better Auth component users or existing identity
links. An isolated rehearsal copied all application records and linked synthetic
replacement identities for every legacy profile. It preserved all lists, sections,
todos, memberships and invites, retained legacy profiles and canonical web/MCP
owners, removed only unused duplicate profiles, and passed idempotent retries.
The rehearsal proves data compatibility, not ownership of any real replacement
identity. The backup, inventory, hashes and evidence review stay outside Git.

Production application data has not been changed. There are no verified production
Better Auth IDs to apply yet. An approved cutover must create those identities and
verify account control before linking. Do not copy development IDs, seed guessed
auth accounts, or restore the development database into production.

Before public cutover:

1. Account for each legacy profile, including other people and abandoned/test
   accounts. Record the reviewed disposition privately; do not delete unclaimed data.
2. Establish an authenticated transition for each active user. For a supervised
   cutover, authenticate with Better Auth in the separately approved release window,
   verify control of the legacy identity independently, and link before allowing
   new lists, memberships or invites. If active users cannot be migrated together,
   prepare a staged authenticated linking flow before replacing public Clerk login.
3. Take a fresh production backup, rehearse any changed data, review exact mapping
   previews and apply only verified pairs. Disable the maintenance gate immediately
   afterward. Check owned lists, shared memberships and MCP identity resolution.
4. Coordinate backend/frontend release and rollback separately. Before enabling
   writes, verify the same provider on both sides and test real login/access. A
   rollback must restore matching backend/frontend versions. After new data is
   written, review it before rollback; blindly restoring a snapshot would lose it.

The 90-day session change and profile-modal fixes require the updated code to be
deployed. No production deployment or merge was performed during this preparation.

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

For any target deployment, the Google redirect URI is:

```text
https://<deployment>.convex.site/api/auth/callback/google
```

The approved development HTTP/auth URL is
`https://exciting-gazelle-205.eu-west-1.convex.site`.

The production frontend is `https://ritodo.rinadely.com`. Its matching backend URLs
are `https://expert-guineapig-443.eu-west-1.convex.cloud` and
`https://expert-guineapig-443.eu-west-1.convex.site`. The production Google callback
is `https://expert-guineapig-443.eu-west-1.convex.site/api/auth/callback/google`.

For each separately approved environment, Marko must:

- Provide the matching public `.cloud` and `.site` URLs above.
- Set server-only `SITE_URL` to the exact Vite app origin, such as
  `http://localhost:5174` for local development. This is the trusted browser origin
  and the cross-domain return destination. Use a separate environment for a different origin.
- Supply a random `BETTER_AUTH_SECRET` with at least 32 bytes of entropy, stored
  only in the Convex server environment. Keep it stable across restarts.
- Provide Google Web application OAuth `GOOGLE_CLIENT_ID` and
  `GOOGLE_CLIENT_SECRET` in the Convex server environment and add the exact redirect
  URI above to that OAuth client's authorized redirect URIs. Vite's origin is not
  the Google callback. `CONVEX_SITE_URL` is supplied by Convex.
- Configure `RESEND_API_KEY` on the Convex server, plus
  `AUTH_EMAIL_FROM=RiTodo <login@rinadely.com>`. Marko reports these are already set
  on development. No Resend webhook is required to send mail; delivery-status
  webhooks are optional and have not been configured.

Missing email settings prevent queueing delivery. Better Auth catches callback
failures and returns a generic send-code response, so a successful HTTP response
alone does not prove that an email was queued or delivered. Check server errors
and Resend delivery status during the real inbox test.

No secret belongs in a `VITE_*` variable or a checked-in env file. Deployment used
an explicit deployment-name selector and a temporary config containing only its
public deployment name. `convex run --push` refuses production deployments and
avoids the project env-file updates performed by `convex dev`.

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
3. In a separately reviewed internal mutation, set `betterAuthId` on the
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

### Implemented maintenance operations

`system/identityLinks:preview` takes one `clerkId` and `betterAuthId`. It is an
internal, read-only query. It does not establish that the two identities belong
to the same person. Only submit pairs supported by independent evidence of
control of both accounts, reviewed by an operator. An email match is insufficient.

`system/identityLinks:apply` is an internal mutation. It requires:

- `AUTH_IDENTITY_LINKING_ENABLED=true` on the separately approved target environment.
  It was temporarily enabled for the approved development link on 2026-10-27 and
  removed immediately afterward. Keep it disabled during normal use.
- The exact preview's `legacyUserId`, `newProfileId`, `legacyUpdatedAt` and
  `newProfileUpdatedAt`. Changed profiles require another preview and review.
- `reviewedBy`, `evidenceReference`, and confirmation `LINK_VERIFIED_IDENTITIES`.
  Store a reference to reviewed evidence, never session tokens, keys or raw proof.

The mutation checks both mapping directions and audits. It refuses missing or
duplicate profiles, conflicting links, and any list, membership or invite in the
new identity's namespace. It retains the legacy profile and ownership IDs,
removes an unused duplicate profile transactionally, syncs the current Better Auth
profile, and writes one audit record. Repeating an already applied pair is a no-op.
An MCP list-creation transaction also checks whether its earlier identity became
stale, preventing a concurrent request from creating hidden ownership after linking.

Do not enable or run this on real records until a backup, isolated rehearsal,
reviewed evidence and explicit approval are complete. If the new account already
has data, stop for a separate reconciliation plan. No executor for that case is
included. Disable the maintenance gate after an approved run.

## MCP key transition

`convex/mcp/auth.ts`, its `@clerk/backend` dependency and `CLERK_SECRET_KEY` remain.
MCP accepts both new Better Auth keys and existing Clerk user keys. Tokens with
the reserved `ritodo_` prefix are verified only by Better Auth and are never sent
to Clerk, including when invalid, revoked, expired or rate limited. Other tokens
use the existing Clerk verification path. A verified Better Auth key's owner must
still exist. An unlinked key cannot access legacy data based on matching email.

Clerk keys cannot be converted to Better Auth keys. Each user must create a new
key, replace the bearer token in their MCP client, test it, then revoke the old
key through Clerk. Keep the Clerk backend dependency and credentials until that
transition is completed and separately approved for removal.

The legacy signed `/clerk-webhook` remains with `svix` and `CLERK_WEBHOOK_SECRET`.
It syncs unlinked legacy profiles. Once linked, Better Auth owns profile updates,
so delayed Clerk events cannot overwrite edits. Clerk web JWT trust and
`@clerk/react` have been removed.

The account menu shows Settings and sign-out. Name editing uses Better Auth's
`updateUser`; email remains read-only. Email change, provider unlinking and
account deletion need separate verified workflows. The MCP settings list contains
Better Auth keys. Existing Clerk keys must still be managed and revoked in Clerk.

To inspect the local UI, open `http://localhost:5174`, sign in, click your name in
the sidebar, then Settings. Choose Profile or MCP keys. Creating or revoking a key
there changes development data; the agent tested these interactions with sample
data only and has not created a real key on your behalf.

### Local Better Auth component

The API-key plugin requires a schema extension, so the component now uses the
official local-install layout in `convex/betterAuth`, retaining the existing
`betterAuth` mount. All existing auth validators are retained; current upstream
generation also adds two optional two-factor fields. The only new auth table is
`apikey`. Custom key, owner and expiration indexes are in `schema.ts`.

Regenerate the auth schema locally without reading env files:

```sh
bun --no-env-file scripts/generate-auth-schema.ts
```

The generator deliberately includes every schema plugin from the pinned Convex
component plus the official API-key plugin. Its package-source imports run only
in the generator, never in the deployed runtime. Review schema compatibility on
upgrades, then refresh Convex-generated types through the approved development
workflow. Keep the component mount named `betterAuth` to preserve existing data.

## Package compatibility and local verification

Better Auth uses the patched `~1.6.33` line within the component's supported
`>=1.6.11 <1.7.0` peer range. The component's published React provider type incorrectly
infers session data as `never` with patched Better Auth releases. A single
`@ts-expect-error` marks that prop boundary, without changing the inferred client
types elsewhere. Remove it when [upstream issue 420](https://github.com/convex/better-auth/issues/420)
is fixed. Do not downgrade below security patches to silence this error.

The initial offline `ComponentApi` references in `convex/_generated/api.d.ts`
have now been regenerated by the successful development push, along with the
server helpers. Typecheck passes against those generated definitions.

The in-memory tests run with `bun --no-env-file test tests/auth.test.ts`. They test mapped legacy
access, isolation of an unlinked matching email, expired sessions, profile sync,
HTTP session renewal after one day and the unchanged Clerk-ID MCP query path.
They also exercise email-code sign-in through a mocked Resend callback, persistent
session cookies, rejection of a reused code and missing sender configuration.
They also test the actual local component and API-key plugin through HTTP:
MCP list access, key hashing, owner isolation, expiration, revocation, deleted
owners, blocked browser-session escalation and Clerk fallback. Identity-link tests
cover read-only preview, the disabled gate, conflict checks, stale review,
idempotence, duplicate profile cleanup and preserved legacy data. Profile tests
cover updates, unchanged ownership, delayed Clerk events and blocked email overwrite.
They do not connect to Convex or send email. The current suite has 17 tests.
After rebasing onto current `main`, `bun run check` uses oxlint and TypeScript 7
to check lint and frontend/backend types. The build was run through
Vite's JavaScript API with `envDir: false`, so no env files were read.
Coderi's browser snapshot timed out. A separate headless Chrome test then exercised
the actual project components with an in-memory auth client and non-local requests
blocked. It verified profile save/session refresh, key creation and copying,
confirmed revocation and cancellation, load-error retry, offline controls,
pagination including deletion of the last item on a page, Escape/focus restoration,
and removal of the one-time secret after closing. Screenshots were inspected at
desktop and mobile widths. The dialog fits 375px and 320px viewports with no
horizontal overflow and produced no browser errors. That earlier check used the
original black auth palette; the integrated design now follows the app theme.
The integrated design was also checked with the real components, a sample auth
client and all external requests blocked. Chrome checks passed six-digit automatic
verification, invalid-code recovery, resend/change-email/offline controls, successful
profile-save dismissal and focus restoration, failed-save retention, and key
creation/copy/cancel/revocation. Dialog bounds passed at 1280px, 375px and 320px in
light and dark themes with no browser errors. Screenshots were inspected. These
checks did not start another server, change the existing port-5174 server, send
email, or create real accounts or keys.

These UI checks do not establish real inbox delivery or a real user's MCP-client
configuration. Development contains only the single owner-confirmed mapping
described above; production identity links still need verified replacement accounts.

## Official references

- [Convex React and Vite integration](https://labs.convex.dev/better-auth/framework-guides/react)
- [Convex auth triggers](https://labs.convex.dev/better-auth/features/triggers)
- [Supported plugins](https://labs.convex.dev/better-auth/supported-plugins)
- [Local auth component installation](https://labs.convex.dev/better-auth/features/local-install)
- [Better Auth API keys](https://better-auth.com/docs/plugins/api-key)
- [Better Auth profile updates](https://better-auth.com/docs/concepts/users-accounts)
- [Email OTP](https://better-auth.com/docs/plugins/email-otp)
- [Session expiration and renewal](https://better-auth.com/docs/concepts/session-management)
- [Google OAuth](https://better-auth.com/docs/authentication/google)
- [Official Convex Resend component](https://github.com/get-convex/resend#readme)
