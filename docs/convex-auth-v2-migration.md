# Convex Auth v2 rollout

RiTodo uses first-party Convex Auth 2.1.0 for Google sessions when the rollout
is enabled. The existing Google account must already be linked in Better Auth.
At the end of the verified Google callback, RiTodo looks up the exact Google
subject and provider in the old account table and returns the existing
`users._id` to Convex Auth. The callback never matches accounts by email.
Existing Clerk links still determine ownership where present. Other accounts
keep their `better-auth:<id>` ownership. Lists, todos, memberships and invite
creator IDs need no backfill.

Google users with a matching account switch to native sessions the next time
they sign in with Google. A first-time Google user or a user who previously used
only email codes goes through the existing Google flow on their first Google
sign-in. RiTodo retries there after the verified native callback finds no older
Google binding. Subsequent Google sign-ins use Convex Auth once Better Auth has
recorded the Google account. Existing Better Auth browser sessions continue
until sign-out or expiration. Open invitations return to the same invite URL.

## Sessions and recovery

- A native Google session has a 60-second access token, a 90-day refresh
  inactivity timeout, and an absolute 90-day limit measured from sign-in.
  Returning within that limit can resume the browser session. Refresh rotates
  the token without moving that deadline, so even an active user signs in again
  after 90 days. An issued access token retains its one-minute lifetime.
  Convex signs it with the deployment key.
- Email still uses a six-digit code, a five-minute expiry, and three verification
  attempts. It proves control of the inbox for sign-in and account recovery.
  There are no password credentials to transfer or reset. Better Auth still
  issues the email sessions with the prior 90-day sliding expiry and one-day
  renewal interval.
- Convex Auth 2.1.0 supports magic links. Its email challenge sends a link and its
  custom sign-in builder is marked internal. The existing code entry therefore
  uses the supported Better Auth integration. Convex's migration documentation
  covers reusing app user records and does not provide a Better Auth import or
  session exchange. [Convex guidance for existing users](https://docs.convex.dev/auth/convex-auth/migrating/existing-user-data) · [Convex Auth 2.1.0 release](https://ship.convex.dev/changelog/convex-auth-v2-1-0)
- Native and legacy sign-ins manage the same hashed MCP keys. Existing keys keep
  their owner, rate limit, expiration and revocation behavior. Keys created from
  native settings also use Better Auth's key generator and verifier. Clerk keys
  still verify through Clerk and are managed there.

## Release sequence

These are instructions for a separately approved release. The PR disables
automatic Vercel deployment of its branch.

1. Back up the target deployment. Review any outstanding Clerk-to-Better-Auth
   links using the evidence process in [the Better Auth migration](./better-auth-migration.md).
   Finish those reviewed links before enabling native Google. A profile already
   referenced by a native Google account cannot be deleted by the old Clerk linker.
2. On the target Convex deployment, set `AUTH_GOOGLE_CLIENT_ID` and
   `AUTH_GOOGLE_CLIENT_SECRET` for the native component. Use the same Google OAuth
   application as the legacy Google flow. Register
   `https://<convex-site>/oauth/google/callback` with Google, and retain
   `https://<convex-site>/api/auth/callback/google` for the legacy flow.
   Keep legacy `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` for fallback.
   The native component requires its two values at deploy time. For a deployment
   without Google, use non-secret placeholders and keep the frontend flag off.
3. Keep `SITE_URL` set to the exact frontend origin without a path. Keep
   `BETTER_AUTH_SECRET`, `AUTH_EMAIL_FROM` and `RESEND_API_KEY` for email and key
   compatibility. Keep `CLERK_SECRET_KEY` and `CLERK_WEBHOOK_SECRET` where the
   existing Clerk key fallback and profile sync are in use. Retain the existing
   frontend Convex and HTTP URLs. No native JWT key or JWKS environment variable
   is needed. [Native Google configuration](https://docs.convex.dev/auth/convex-auth/methods/oauth) · [Session configuration](https://docs.convex.dev/convex-auth-api/server/#setupconvexauth)
4. Deploy the additive backend first with `AUTH_V2_GOOGLE_ENABLED` unset and
   `VITE_CONVEX_AUTH_V2=false`. Check both Google callback registrations and
   the existing email code and MCP paths on the approved target. Set
   `AUTH_V2_GOOGLE_ENABLED=true` on Convex and enable `VITE_CONVEX_AUTH_V2=true`
   for the frontend build. Verify a linked Google account, a first Google sign-in,
   a code sign-in, a pending invite, and existing key use and revocation.
   Installed PWAs pick up the change when they load the updated app bundle.
5. To roll back, unset `AUTH_V2_GOOGLE_ENABLED` to stop new native Google sign-ins.
   For a full frontend rollback, switch the frontend flag off and rebuild.
   Keep both auth
   components mounted and leave the data and provider callback registrations
   in place through the rollback window. A user with only a native session
   signs in with their existing Google account or email code. Key and profile
   changes made while native auth was enabled stay available in Better Auth.

Removal of Better Auth requires a supported code flow or an approved switch
to magic links, and a plan for replacing its MCP key storage and verification.
Removal of Clerk infrastructure requires retiring its remaining API keys and
webhook. The old ownership IDs survive both changes.
