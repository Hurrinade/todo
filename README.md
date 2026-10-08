# Todo Workspace

This project is an authenticated todo list workspace built with React, Vite,
Clerk, Convex, TanStack Virtual, Tailwind CSS 4, and shadcn UI.

## What is included

- React 19 + Vite 8 + TypeScript 6
- Clerk authentication
- Convex client wiring and todo schema/functions
- TanStack Virtual for bounded regular-list DOM rendering
- Vite-native PWA baseline via `vite-plugin-pwa`
- Global modal host with a confirmation modal example
- Warm light and dark semantic theme tokens in `src/index.css`
- Route, hook, type, and component structure for the todo workspace

## Setup

1. Install dependencies:

```bash
bun install
```

2. Create your local environment file from `.env.example`.

Required frontend env keys:

- `VITE_CLERK_PUBLISHABLE_KEY`: Clerk publishable key from the Clerk dashboard
- `VITE_CONVEX_URL`: Convex client URL for the current deployment
- `VITE_CONVEX_SITE_URL`: Public site URL used for auth/callback configuration

Optional local workflow key:

- `CONVEX_DEPLOYMENT`: helpful for Convex local tooling such as `npx convex dev`

3. Verify the project:

```bash
bun run check
```

4. Build the production bundle when needed:

```bash
bun run build
```

## PWA Baseline

- The template ships with a generated `manifest.webmanifest` and service worker
  through `vite-plugin-pwa`.
- RiTodo uses a blue list-to-check mark on a permanent black tile for its
  favicon, Apple touch icon, and install icons. Regenerate the raster assets
  from `public/ritodo-icon.svg` with
  `bun run generate:pwa-assets`.
- This baseline is intentionally minimal: there is no custom install prompt,
  update prompt, or offline-specific UI yet.
- Production deployments should serve the app over HTTPS and serve
  `manifest.webmanifest` with the correct MIME type.

## Quality Commands

```bash
bun run lint
bun run lint:fix
bun run typecheck
bun run format
bun run check
bun test
```

`bun run check` is non-mutating. It runs linting and typechecking.

## Convex list counters

Todo lists keep denormalized open-todo, completed-todo, and member counts so
the browser and MCP list endpoints do not collect every related todo. New
lists initialize these counters automatically, and shared mutation helpers
maintain them for web and MCP writes.

## Regular-list scaling

Regular lists subscribe to all open todos in ordered form so drag-and-drop has
the complete order. Completed todos do not load until the Completed section is
opened; they then load newest-first in cursor pages of 40. The combined regular
list is dynamically measured and virtualized, with eight rows of overscan.

Regular drag-and-drop sends one moved todo, one anchor todo, and a before/after
placement. Convex normally updates only that todo by assigning a sparse numeric
rank. If adjacent ranks run out of floating-point space, the open bucket is
rebalanced to multiples of 1024 in the same transaction. Sectioned-list
ordering remains on its existing separate path.

## RiTodo MCP Server

The Convex deployment exposes a stateless Streamable HTTP MCP server at
`/mcp`. It uses revocable Clerk user API keys and applies the same list
membership rules as the web app, including access to shared lists.

### Backend setup

1. Open [Clerk Platform API Keys](https://dashboard.clerk.com/~/platform/api-keys)
   and enable **User API keys** in every Clerk instance that should support MCP
   access. Keep Organization API keys disabled for RiTodo.
2. Set `CLERK_SECRET_KEY` in the matching Convex deployment environment. Keep
   this backend secret out of Vite environment files and client code.
3. Deploy the Convex functions. The production MCP URL is:

```text
https://expert-guineapig-443.eu-west-1.convex.site/mcp
```

The development endpoint uses the development `VITE_CONVEX_SITE_URL` with the
same `/mcp` path.

### Codex setup

In RiTodo, open the account menu in the sidebar, choose **Manage account**, and
use the **API Keys** page to create or revoke a user-scoped key. Copy the
`ak_live_...` secret when it is created because Clerk displays it only once.

On macOS, store that user API key in the GUI launch environment used by the
Codex app without putting the secret in shell history:

```bash
read -s "RITODO_KEY?Clerk API key: "
echo
launchctl setenv RITODO_API_KEY "$RITODO_KEY"
unset RITODO_KEY
```

`RITODO_API_KEY` must contain the user-scoped `ak_live_...` key, not Clerk's
frontend `pk_live_...` key or backend `sk_live_...` key. The backend
`CLERK_SECRET_KEY` remains only in the matching Convex environment.

Add the following to the global `~/.codex/config.toml`. Do not place the key
itself in TOML or commit it to the repository.

```toml
[mcp_servers.ritodo]
url = "https://expert-guineapig-443.eu-west-1.convex.site/mcp"
bearer_token_env_var = "RITODO_API_KEY"
enabled = true
default_tools_approval_mode = "writes"
tool_timeout_sec = 30
```

Quit the Codex app completely with `Cmd-Q` after changing its environment or
configuration, reopen it, and create a new task. Run `codex mcp list` to confirm
that `ritodo` is enabled.

### Available MCP tools

- Read: `list_todo_lists`, `list_todos`, `get_todo`
- Lists and sections: `create_todo_list`, `rename_todo_list`,
  `create_todo_section`, `rename_todo_section`
- Todos: `create_todo`, `update_todo`, `move_todo`, `set_todo_completed`,
  `delete_todo`

`list_todos` accepts optional list, section, and completion filters. Omitting
all filters loads open and completed todos from every accessible list.

## Current Routes

- `/`: shared root page example in `src/pages/Root.tsx`
- `/home`: authenticated todo workspace in `src/pages/authenticated/home/Home.tsx`
- `/public`: unauthenticated example page in `src/pages/unauthenticated/public/Public.tsx`

## Adding New Pages

- Keep `/` as the special root file in `src/pages/Root.tsx`.
- Put authenticated routes under `src/pages/authenticated/...`.
- Put unauthenticated routes under `src/pages/unauthenticated/...`.
- Mirror nested route segments with kebab-case folders.
- Name page files in PascalCase.

Examples:

- `/dashboard` → `src/pages/authenticated/dashboard/Dashboard.tsx`
- `/home/home-detail` → `src/pages/authenticated/home/home-detail/HomeDetail.tsx`
- `/public` → `src/pages/unauthenticated/public/Public.tsx`

## Hooks, Types, and Modals

- Route-scoped hooks should live in matching folders like
  `src/hooks/todo/use-todo.ts` when a hook is needed.
- Route-scoped types should live in matching folders like
  `src/types/todo/todo.types.ts`.
- Shared modal components should live under `src/components/modals/...`.
- Register global modal entries in `src/context/modal/ModalProvider.tsx`.

## Import Policy

- Prefer direct imports from the concrete module path, for example
  `@/components/todo/TodoWorkspace` or `@/components/ui/button`.
- Keep root barrel files only for intentionally shared public entry points.
- When adding new files, update a root barrel only if that module is meant to be
  a shared template-level export.

## Provider Pattern

- `src/context/ConvexClerkProvider.tsx` is the canonical Convex + Clerk wrapper.
- `src/main.tsx` should compose app-level providers using that wrapper instead of
  duplicating the Convex provider setup inline.

### Commands to check package.json versions

```bash
# Lists latest versions
npx npm-check-updates

# Applies versions to package.json
npx npm-check-updates -u

```
