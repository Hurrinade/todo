# Project overview

This is an authenticated todo list app built from the company React template.
The first product surface is a personal todo workspace with Convex storage and
Clerk authentication, todo notes, per-list emoji, shared list memberships, and
expiring invite links. A stateless Streamable HTTP MCP endpoint at `/mcp`
exposes authenticated todo operations to Codex through Clerk user API keys.

## Commands

```bash
# Development and quality
bun install          # Install dependencies
bun run lint         # Run lint checks
bun run lint:fix     # Run lint checks and auto-fix
bun run format       # Format project files
bun run typecheck    # Check for ts errors
bun run check        # Run lint and typecheck without mutating files
bun test             # Run Bun unit, MCP protocol and Convex operation tests
```

## MCP

- `/mcp` is served by the Convex HTTP deployment and uses the web-standard MCP
  transport in stateless JSON-response mode.
- MCP authentication accepts only revocable Clerk user API keys. Keep
  `CLERK_SECRET_KEY` in the Convex backend environment and never in Vite client
  variables or Codex TOML.
- Users create and revoke their user-scoped MCP keys from the API Keys page in
  Clerk's profile modal, opened through the account menu in the todo sidebar.
- MCP tools must derive the Clerk user ID from the verified key and reuse the
  existing list membership checks; never accept a user ID from tool input.
- Read tools must be marked read-only, writes must be marked as writes, and
  destructive annotations are reserved for destructive operations.

## Current Routes

- `/` — Public landing page
- `/home` — Authenticated todo workspace
- `/home/todos/:todoId` — Authenticated todo detail edit route
- `/invite/:token` — Public invite acceptance route

## Tech Stack (current versions)

| Category         | Technology             | Version |
| ---------------- | ---------------------- | ------- |
| Framework        | React                  | 19      |
| Language         | TypeScript             | ~6.0    |
| Bundler          | Vite                   | 8       |
| PWA              | vite-plugin-pwa        | 1       |
| Routing          | React Router           | 7       |
| Styling          | Tailwind CSS           | 4       |
| UI Components    | shadcn (radix-nova)    | 4       |
| Icons            | Lucide React           | 1.8     |
| Auth             | Clerk (`@clerk/react`) | 6       |
| Database         | Convex                 | 1.36    |
| MCP              | MCP TypeScript SDK     | 1.29    |
| State Management | Zustand                | 5       |
| Data Fetching    | TanStack React Query   | 5       |
| Date Handling    | dayjs                  | 1.11    |
| Linting          | ESLint                 | 9       |
| Formatting       | Prettier               | 3.8     |

## Important links and notes

Always use this links as up to date reference on how to do something with each technology/package.

Convex docs url: https://docs.convex.dev/home

- docs give best practices and how to use convex
- For db convex must be used along with clerk auth. In official documentation of the convex it says how to implement clerk, react, vite and convex

Clerk docs url: https://clerk.com/docs/react/getting-started/quickstart

- Again reference convex docs to make auth with db and convex api layer

React docs url: https://react.dev/reference/react

- Use it for up to date practices and latest usefull information

Zustand docs url: https://zustand.site/en/docs/

- for global data handling

React router docs url: https://reactrouter.com/start/declarative/routing

Other project built on vite reference path: /Users/hurrinade/Documents/Projects/todo

## Usefully extra packages if needed

- for animations use Motion (https://motion.dev/docs)
- for drag and drop use dnd kit (https://dndkit.com/react/quickstart/)
- for company logo icons/svgs use (https://simpleicons.org/)

## Component architecture pattern

- Keep components small and focused.
- Split larger components into smaller components in separate files.
- Compose screens/pages by importing smaller components.
- Use the root `ModalProvider` for cross-app modal orchestration and register reusable modal entries there instead of mounting ad-hoc page-level modal hosts.

## Folder organization

### Page files

- All route pages live in `src/pages`.
- The special root route `/` is the only exception and should be a direct file:
  `src/pages/Root.tsx`
- All other pages should be placed under `src/pages/authenticated` or
  `src/pages/unauthenticated` depending on which state owns the route.
- Nested routes should mirror route segments with kebab-case folders.

Examples

- `Root.tsx` is the page for `/`
- `Home.tsx` is in folder `home` because route is `/home`
- `Public.tsx` is in folder `public` because route is `/public`
- `HomeDetail.tsx` would be in folder `home/home-detail` because route is `/home/home-detail`

### Component, Hook, Util, Store, Type files

- Shared components should live in folders such as `components/ui` or
  `components/modals` or `components/common`.
- Route-scoped hooks, stores, utils, and types should use matching nested folders,
  for example `hooks/home`, `stores/home`, `utils/home`, `types/home`.
- Shared hook, store, util, component, and type entry points should be exported from
  their root `index.ts` barrel file.
  - all imports in that way can just go from folder they are in like `@/types` or `@/hooks`, etc.
- `src/lib/utils.ts` is an allowed shared helper exception for the common `cn` utility and should not be treated as a folder-structure violation.

### Context/Providers

- all provider/context files should go in folder `src/context` under their dedicated folder
  - for example modal provider has dedicated `modal` folder which has context and provider

## File and Folder naming convention

- exception to this naming conventions are shadcn components inside `src/components/ui/` folder

### Any tsx file

- any component file should be named in PascalCase, example is `ConfirmationModal.tsx`

### Folder naming

- if it is multi word folder it should be in kebab-case, otherwise just lowercase

### Hook, Store and Util files

- They should be named in kebab-case
  - all hooks should start with word `use`, so for example `use-modal.ts`
  - all store files should end with word `store`, so for example `home-store.ts`
  - all utils files should end with word `utils`, so for exampl `home-utils.ts`

### Type files

- files should be named per page or feature, for example page Home should have its
  route-specific types in `home.types.ts`

## PWA

- keep the `vite-plugin-pwa` setup generic at template level and replace
  placeholder manifest metadata and PWA assets per project

## Theme and background

- The theme system lives in `src/utils/theme/theme-utils.ts` and is consumed through `useTheme`.
- Keep the blue, purple, and regular background picker as a background-only preference stored separately for light and dark mode.
- Background classes are applied to `<html>` as `background-blue`, `background-purple`, or `background-regular`.

## Legal, Privacy, GDPR

- For real SaaS, startup, portfolio, or authenticated apps, add a basic
  project-specific legal/privacy setup instead of leaving generic placeholders.
- Treat EU/GDPR/ePrivacy as the default baseline unless the project explicitly
  defines another jurisdictional scope. This is a compliance starting point, not
  a substitute for lawyer-reviewed legal documents.
- Add a Privacy Policy page that clearly explains the controller/contact,
  personal data collected, purposes, legal basis, retention, processors or third
  parties, international transfers if any, user rights, and complaint/contact
  path.
- Add a Terms of Service page for SaaS, startup, marketplace, paid, account, or
  user-generated-content products.
- Add a Contact page or clearly visible support/privacy email.
- For authenticated apps, keep a settings/account area where users can manage
  their profile, preferences, privacy links, and account/data deletion path.
- Production deployments must use HTTPS.
- If the app uses non-essential cookies, analytics, ads, tracking pixels,
  session replay, marketing tools, or similar browser/device storage, add cookie
  consent before those tools load.
- Do not load analytics or tracking before consent. Strictly necessary cookies do
  not need consent, but they should still be disclosed.
- Cookie consent UI must provide clear accept, reject, and manage choices, and
  must store the user's choice.
- If users can register, provide an account/data deletion path. Deletion should
  remove or anonymize app-owned user data where legally possible and document any
  data retained for legal, security, billing, or abuse-prevention reasons.
- Privacy and terms text must match the actual project, providers, cookies,
  analytics, auth, database, payments, email, and hosting setup. Do not copy
  generic legal filler that does not describe the app.
- References for future agents:
  - GDPR Art. 13 privacy notice content: https://gdpr-info.eu/art-13-gdpr/
  - GDPR Art. 17 erasure/deletion rights: https://gdpr-info.eu/art-17-gdpr/
  - GDPR Art. 25 privacy by design/default: https://gdpr-info.eu/art-25-gdpr/
  - GDPR Art. 32 security basics: https://gdpr-info.eu/art-32-gdpr/
  - ICO cookie guidance: https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/cookies-and-similar-technologies/

## Important notes

- Do not run dev server.
- Always run `bun run check` when you finish adding code
- Always use TypeScript.
- Awlays trust TypeScript there is no need for overcomplicating type checks if item has correct type.
- Put all types always in `src/types`.
- `src/types` is type-only: keep only type declarations there (no functions, constants, runtime logic).
- No inline styles and no animations.
- Any config files must go in `src/config` folder
- always delete files you don't use anymore
- always focus any new components and pages around `src/index.css` global application styling and pallete
  - don't add new classes to index.css for tailwind rather just use inline tailwind on elements
  - prefer using flex instead of grid for layouts unless it is really complex layout
- use english always
- don't overcomplicate things
- don't use useEffect unless it is absolutely necessary (https://react.dev/learn/you-might-not-need-an-effect)
  - use tanstack query for fetching
  - fully focus on interaction based actions so you don't have to use useEffect
- Use `dayjs` for any date parsing and date formatting.
- always keep to date AGENTS.md, CLAUDE.md and project.mdc files
- before creating a new util function or reusable component, search existing code first (use `rg`) and reuse/extend existing implementations when possible
- only create a new utility/component when no suitable existing one exists or extending one would cause coupling or regression
- always import project files with alias import `@/` never with relative or absolute paths
- for any new component you are adding from shadcn please do the official command to add component from shadcn instead of just making it by yourself
- `src/context/ConvexClerkProvider.tsx` is the canonical Convex + Clerk provider wrapper and should be reused from `src/main.tsx`
- Pages should remain focused on layout, structure, and page-specific concerns. Avoid placing general component logic in pages—if a component can encapsulate its own behavior, that logic should live within the component. Treat pages primarily as composition layers that assemble and organize components.
- don't use Date.now() in:
  - react hooks, instead use dayjs().valueOf()
  - convex queries, instead check https://docs.convex.dev/understanding/best-practices/#date-in-queries for official recommended way to handle those
- don't use filtering, use indexes for convex queries
- for any cascade triggers you can use convex-helpers to make triggers based on certain table manipulation instead of doing it manually in each mutation or query
- for any new component you want to add like sidebar, button or some generic components always first check if it exists in shadcn https://ui.shadcn.com/docs/components
- Use shadcn Sonner for toasts it is a component built on sonner package (https://ui.shadcn.com/docs/components/radix/sonner)
- Use Zustand for shared or cross-component state instead of centralizing application logic in a large parent component. Prefer small, focused, connected components that consume state directly from the store. Keep state colocated when possible, and promote it to the store only when it must be shared across routes, features, or distant components.
- Never commit or push unless explicitly instructed.
