# Todo Workspace

This project is an authenticated todo list workspace built with React, Vite,
Clerk, Convex, TanStack Query, Tailwind CSS 4, and shadcn UI.

## What is included

- React 19 + Vite 8 + TypeScript 6
- Clerk authentication
- Convex client wiring and todo schema/functions
- TanStack Query provider setup
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
- Placeholder favicon and install icon assets live in `public/` and should be
  replaced for each real project.
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
bun run format:check
bun run check
```

`bun run check` is non-mutating. It runs linting, typechecking, and Prettier in
check mode.

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
