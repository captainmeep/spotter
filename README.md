# Spotter

Client management, training programs, scheduling and sales for personal trainers.

Trainers sign up and manage their business from the **dashboard**. Clients are invited by their trainer and use the **client portal** to see their goals, and soon their program and sessions.

## Roadmap

| Phase | What | Status |
| --- | --- | --- |
| 1 | Foundation: app, database, trainer and client logins, layouts | Done |
| 2 | Clients: list, profiles, goals, notes, invites | Done |
| 3 | Training programs: exercise library, program builder, sharing with clients | Next |
| 4 | Scheduling: calendar and session booking | Planned |
| 5 | Sales pipeline: leads board and converting leads to clients | Planned |

Later: payments (Stripe), marketing emails and texts.

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router, TypeScript) with Cache Components
- [Supabase](https://supabase.com): Postgres database, logins, row level security
- [Tailwind CSS 4](https://tailwindcss.com) and [shadcn/ui](https://ui.shadcn.com) components
- Hosting: [Vercel](https://vercel.com) (planned)

## Run it locally

You need Node.js 22 and Docker.

```bash
npm install
```

```bash
npm run local:up
```

```bash
npm run dev
```

`npm run local:up` starts a local Supabase in Docker, creates `.env.local`, and adds two demo accounts. Open http://localhost:3000 and log in with:

| Account | Email | Password |
| --- | --- | --- |
| Trainer | `trainer@example.com` | `password123` |
| Client | `client@example.com` | `password123` |

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the app at http://localhost:3000 |
| `npm run local:up` | Start Docker (if needed) and local Supabase, create `.env.local`, seed demo accounts |
| `npm run lint` | Check code style |
| `npm run typecheck` | Check TypeScript types |
| `npm run build` | Production build |
| `npm run db:reset` | Rebuild the local database from the migrations (deletes local data) |
| `npm run db:seed` | Add the demo accounts |
| `npm run db:test` | Run the database tests in `supabase/tests` |
| `npm run test:e2e` | Run the browser tests in `e2e/` (needs `npm run local:up` first; starts the app itself) |
| `npm run db:types` | Regenerate `src/lib/database.types.ts` after changing the schema |
| `npm run db:stop` | Stop local Supabase |

## Project layout

```
src/
  app/
    page.tsx            Landing page
    (auth)/             Log in, sign up, and their server actions
    auth/confirm/       Where links in Supabase emails land
    dashboard/          Trainer area
      clients/          Client list, profiles, notes, invites
    portal/             Client area
    (auth)/welcome/     Invited clients choose a password here
  components/
    app-shell/          Signed-in layout: sidebar, phone menu, account menu
    ui/                 shadcn/ui components
  lib/
    auth.ts             getCurrentUser() and requireUser(role)
    clients.ts          Reading client data for pages
    supabase/           Supabase clients: per-request, proxy, and admin
  proxy.ts              Refreshes the session and redirects signed-out users
supabase/
  migrations/           Database schema, in order
  tests/                Database tests (pgTAP)
e2e/                    Browser tests (Playwright)
scripts/                Local setup and seed scripts
```

## How access works

- Every user has a row in `profiles` with a role: `trainer` or `client`.
- Anyone who signs up on `/signup` becomes a trainer. Users can't change their own role.
- Trainers add clients as records in the `clients` table. A client record doesn't need a login.
- **Invites:** on a client's page, the trainer creates a one-time login link and sends it however they like (text, email, WhatsApp). Opening it creates the client's login (role `client`, set in Supabase `app_metadata` by the server) and asks them to choose a password. If the link expires, the trainer can create a new one. Deleting a client also deletes their login.
- Notes on a client are private to the trainer. Clients can see their own goals.
- Row level security in Postgres decides what each user can read and change, so even a bug in the app can't leak another trainer's data. Trainers see only their own clients and notes; clients see only their own record and their trainer.
- Trainers land on `/dashboard`, clients on `/portal`. Each area checks the role and sends anyone else to the right place.

## Deploying (later)

1. Create a project at [supabase.com](https://supabase.com) and apply the migrations with `npx supabase link` then `npx supabase db push`.
2. In Supabase, under Authentication → URL Configuration, set the Site URL to your app's address and add `https://your-domain/**` to the redirect URLs.
3. In Supabase, under Authentication → Providers → Email, set the email OTP expiration to 86400 seconds, so invite links last 24 hours.
4. Import the GitHub repo in [Vercel](https://vercel.com) and set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY` from Supabase's API settings. Keep the secret key private: it's only used on the server, to create client logins.
