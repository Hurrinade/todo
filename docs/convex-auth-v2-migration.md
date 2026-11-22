# Convex Auth v2 cutover

RiTodo uses Convex Auth 2.1.0 for Google and email sign-in. Users sign in again
after the cutover. Email users request a link from the existing dialog and open
it in the same browser within 10 minutes. The link returns them to an open
invitation when they started there. A new link also creates an account. New email
users can add their name in Settings.

Both methods issue 60-second access tokens and rotate refresh tokens. Refresh can
resume a session after inactivity, up to 90 days from sign-in. Users sign in again
at that absolute limit, even if they remain active. A previously issued access
token retains its one-minute lifetime. [Convex session API](https://docs.convex.dev/convex-auth-api/server/#setupconvexauth)

## Existing access

- Google uses the verified provider subject to find the historical account.
  A matching profile email alone never lets a different Google subject claim
  historical data. Users with a verified legacy email and no matching Google
  subject start with a sign-in link. After that recovery, a verified Gmail or
  matching Google Workspace account can use the same profile. For addresses
  managed by another provider, use the email link to recover access.
- Email recovery runs after Convex Auth consumes the single-use link and verifies
  the browser secret. RiTodo reads the email from Convex Auth's verified email
  component. Recovery requires the historical auth record to mark that address
  verified too. Conflicting bindings fail closed for review. Clerk profiles
  without a reviewed link remain separate even if their email matches.
- Both methods resolve to the original RiTodo profile and ownership IDs when
  recovery succeeds. Existing lists, todos, shared memberships and invite creator
  IDs stay in place. The original Google account works even if its email changed.
- Active `ritodo_` keys keep their hash, owner, ID, expiration and usage counters.
  The Convex backend checks and updates the row in one transaction. Settings
  still lists, creates and revokes keys. Existing Clerk user keys can still
  authenticate to MCP and are managed through Clerk.

The component mounted as `betterAuth` now contains only data and Convex functions.
Its original mount and schema preserve the historical proof records and the key
store. Better Auth packages, browser sessions, JWT trust and HTTP routes are
gone. No passwords were enabled in the prior version. Convex Auth provides native
magic links in this release. [Convex Auth 2.1.0 release](https://ship.convex.dev/changelog/convex-auth-v2-1-0)

## Release sequence

1. Choose a coordinated backend and frontend release window. Save the old code
   revisions and a private deployment backup. Review any outstanding Clerk
   ownership links using the existing maintenance workflow before cutover.
   Complete links backed by independent evidence. Existing profiles referenced
   by a native identity cannot be merged by the old Clerk linker.
2. Configure Convex with `SITE_URL` as the exact frontend origin, plus
   `AUTH_GOOGLE_CLIENT_ID`, `AUTH_GOOGLE_CLIENT_SECRET`, `AUTH_EMAIL_FROM` and
   `RESEND_API_KEY`. Use the existing Google OAuth application to retain its
   provider subjects. Register `https://<convex-site>/oauth/google/callback`
   and keep the old `/api/auth/callback/google` registration and Better Auth
   variables through the rollback window. Keep the existing `CLERK_SECRET_KEY`
   and `CLERK_WEBHOOK_SECRET` where legacy MCP keys and webhook sync are used.
   Retain the frontend's `VITE_CONVEX_URL` and `VITE_CONVEX_SITE_URL`.
   [Convex Google configuration](https://docs.convex.dev/auth/convex-auth/methods/oauth)
3. Deploy in place to retain the original `betterAuth` component data. Deploy
   the backend immediately before the frontend build. Give installed PWAs time
   to pick up the new bundle and reload older tabs before signing in. Tell users
   that the next sign-in uses Google or a link. Confirm both methods, a pending
   invitation, an existing MCP key, and key revocation on the approved target.
4. If the release fails before reopening, roll the app and backend revisions
   back together against the same database. The old web runtime can read the
   original accounts and the current key rows for those accounts. Once native-only
   accounts have been created, prefer fixing forward. A rollback would require
   reconciling those accounts and their work, plus any profile edits. Preserve
   current key rows so a revoked key cannot become active again from a backup.

For isolated development, use an anonymous local deployment and these backend
settings with fixture mail delivery and a fake Google callback:

```dotenv
SITE_URL=http://localhost:5174
AUTH_GOOGLE_CLIENT_ID=fixture-google-id
AUTH_GOOGLE_CLIENT_SECRET=fixture-google-secret
AUTH_EMAIL_FROM=RiTodo <fixture@example.test>
RESEND_API_KEY=re_fixture_no_outbound_mail
```

The PR branch disables automatic Vercel deployment. After the rollback window,
archive the old credentials and callbacks through the release process. Keep the
data mount until the app has a separate verified identity and MCP key migration.
