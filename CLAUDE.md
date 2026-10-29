@AGENTS.md

# Spotter

CRM for a personal trainer: clients, training programs, scheduling, sales pipeline. Trainers use `/dashboard`, their clients use `/portal`. See README.md for the roadmap and setup.

## Commands

- `npm run local:up`: start Docker, local Supabase, write `.env.local`, seed demo users. Run this first in a fresh cloud session; Docker isn't running by default there.
- `npm run dev`: app at http://localhost:3000. Demo logins: `trainer@example.com` / `client@example.com`, password `password123`.
- Before committing: `npm run lint`, `npm run typecheck`, `npm run build`, `npm run db:test` if the schema changed, and `npm run test:e2e` (Playwright; reuses a running dev server).
- E2E tests may read the demo data but must not change it; anything they create gets a unique name and is deleted at the end.

## Conventions

- **Next.js 16 with Cache Components.** Anything that reads the session or queries Supabase must render inside a `<Suspense>` boundary, and pages should put data-dependent parts in their own boundary so the rest of the page shows instantly (see `src/app/dashboard/page.tsx`). Watch the dev server log for `instant` validation errors.
- **Auth.** Use `requireUser(role)` / `getCurrentUser()` from `src/lib/auth.ts` in pages, and call `requireUser` again inside every server action that changes data. The proxy (`src/proxy.ts`) only does a fast signed-in check.
- **Supabase client.** `createClient()` from `src/lib/supabase/server.ts`, one per request. It calls `connection()` so Supabase work always runs at request time. `createAdminClient()` (`src/lib/supabase/admin.ts`) bypasses RLS: only use it in server actions, after checking ownership with the normal client (see `createInviteLink` in `src/app/dashboard/clients/actions.ts`).
- **Data access.** Page reads go through functions like those in `src/lib/clients.ts`, which call `requireUser` first. Mutations live in `actions.ts` next to the pages; call `refresh()` after changing data shown on the current page, or `redirect()`.
- **Dynamic routes.** Pass the `params` promise into a `<Suspense>` boundary and await it there (see `src/app/dashboard/clients/[clientId]/page.tsx`). `usePathname()` also needs a boundary on such routes.
- **Database changes.** Add a migration with `npx supabase migration new <name>`, never edit an applied one once it's merged. Every table gets row level security and policies; add pgTAP tests in `supabase/tests/`. Then run `npm run db:reset`, `npm run db:seed` and `npm run db:types`.
- **Roles.** `profiles.role` comes from `app_metadata` (server-only). Never let users set their own role or trainer.
- **Forms.** Server actions with `useActionState`, validated with zod (see `src/app/(auth)/`).
- **UI.** shadcn/ui on Base UI: use the `render` prop (not `asChild`). Use `ButtonLink` (`src/components/button-link.tsx`) for a link that looks like a button, not `buttonVariants()` on a `Link` (its classes conflict without `cn()`). `ConfirmAction` for destructive actions, `FormattedDate` for dates, `sonner` toasts for errors from client-side actions. Add components with `npx shadcn@latest add <name>`.
- Next.js keeps recently visited pages mounted but hidden, so in Playwright prefer `getByRole` (ignores hidden elements); `getByText`/`getByLabel` may need `{ exact: true }` or `.filter({ visible: true })`.
- The app must work on phones: check new pages at 390px wide.
