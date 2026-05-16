# AGENTS.md

## Project overview

This is react template for all future projects in this company

## Commands

```bash
# Development and quality
bun install          # Install dependencies
bun run build        # Create production build
bun run lint         # Run lint checks
bun run lint:fix     # Run lint checks and auto-fix
bun run format       # Format project files
bun run format:check # Check formatting without writing files
bun run typecheck    # Check for ts errors
bun run check        # Lint, typecheck and prettier check without mutating files
```

## Current Routes

- `/` — Root route
- `/home` — Authenticated example route
- `/public` — Unauthenticated example route

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
| State Management | Zustand                | 5       |
| Data Fetching    | TanStack React Query   | 5       |
| Date Handling    | dayjs                  | 1.11    |
| Linting          | ESLint                 | 9       |
| Formatting       | Prettier               | 3.8     |

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

## Important notes

- Do not run dev server.
- Always run `bun run check` when you finish adding code
- Always use TypeScript.
- Put all types always in `src/types`.
- `src/types` is type-only: keep only type declarations there (no functions, constants, runtime logic).
- No inline styles and no animations.
- always delete files you don't use anymore
- always focus any new components and pages around `src/index.css` global application styling and pallete
  - don't add new classes to index.css for tailwind rather just use inline tailwind on elements
- use english always
- don't overcomplicate things
- don't use useEffect unless it is absolutely necessary
  - use tanstack query for fetching
  - fully focus on interaction based actions so you don't have to use useEffect
- Keep components focused and compose pages from smaller pieces.
  - don't make huge files, split big components into smaller ones when it can be done but don't oversplit it
- Use `dayjs` for any date parsing and date formatting.
- always keep to date AGENTS.md, CLAUDE.md and project.mdc files
- before creating a new util function or reusable component, search existing code first (use `rg`) and reuse/extend existing implementations when possible
- only create a new utility/component when no suitable existing one exists or extending one would cause coupling or regression
- don't assume secondary matching logic, it should always be only one match so like example is that item will have "Key" and never "Id" so when matching don't assume it might have Id just match Key and fallback is if Key does not exist show empty state "-"
- always import project files with alias import `@/` never with relative or absolute paths
- for any new component you are adding from shadcn please do the official command to add component from shadcn instead of just making it by yourself
- `src/context/ConvexClerkProvider.tsx` is the canonical Convex + Clerk provider wrapper and should be reused from `src/main.tsx`
- Pages should remain focused on layout, structure, and page-specific concerns. Avoid placing general component logic in pages—if a component can encapsulate its own behavior, that logic should live within the component. Treat pages primarily as composition layers that assemble and organize components.

### This template project specific note

- if a template placeholder file is kept on purpose, leave a useful example or a clear comment so future agents understand how to extend it
