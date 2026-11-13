# GHS-ELN — Ghana Health Service eLearning Network

Production-grade continuous professional development (CPD) and clinical learning portal for the Ghana Health Service, built on **Next.js 16**, **React 19**, **Tailwind CSS v4**, **Drizzle ORM**, **Supabase** (PostgreSQL + Auth + Storage), and **Vercel**.

---

## Architecture Summary

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 App Router, React 19 |
| Styling | Tailwind CSS v4 (`@import "tailwindcss"`, `@theme` tokens) |
| ORM | Drizzle ORM (`drizzle-orm` + `pg`, no Prisma) |
| Database | PostgreSQL (Supabase, transaction pooler port 6543) |
| Auth | Supabase Auth (`@supabase/ssr`) + session cookie layer |
| Storage | Supabase Storage (private buckets, signed URLs) |
| Hosting | Vercel (serverless + edge) |
| Testing | Vitest (unit), Playwright (E2E at 390/768/1440px) |
| Lint | ESLint (Next.js + strict TS rules) |

---

## Project Structure

```
ghs-etraining-hub/
├── docs/                          # Product specs (PRD, architecture, data model, RBAC, UI/UX, conventions, QA)
├── drizzle.config.ts              # Drizzle kit configuration
├── middleware.ts                  # Edge middleware (session tripwire, RBAC route guard)
├── next.config.ts                 # Next.js config (security headers, image allowlist)
├── vercel.json                    # Vercel build/deploy settings
├── supabase/config.toml           # Supabase local development config
├── package.json
├── tsconfig.json
├── eslint.config.mjs
├── vitest.config.ts
├── playwright.config.ts           # E2E at 390px, 768px, 1440px
├── .env.example                   # Environment variable template
├── .gitignore
├── README.md
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── (auth)/                # Public: login, forgot-password
│   │   ├── (dash)/                # Protected shell: dashboard, directorates, etc.
│   │   │   ├── layout.tsx         # Shell with header + sidebar
│   │   │   └── dashboard/page.tsx # Learner dashboard
│   │   ├── api/health/route.ts    # Health endpoint
│   │   ├── layout.tsx             # Root layout
│   │   ├── page.tsx               # Redirect to /dashboard
│   │   ├── loading.tsx            # Global loading skeleton
│   │   ├── error.tsx              # Error boundary
│   │   ├── not-found.tsx          # 404 page
│   │   └── global-error.tsx       # Global error boundary
│   ├── components/
│   │   ├── layout/                # Header, Sidebar
│   │   └── ui/                    # Card, Badge, Stat, EmptyState, utils
│   ├── db/
│   │   ├── index.ts               # Drizzle singleton (server-only)
│   │   ├── schema.ts              # All tables (snake_case, camelCase TS)
│   │   └── seed.ts                # Idempotent seeder
│   └── lib/
│       ├── client/supabase-browser.ts   # Browser Supabase client
│       ├── format.ts                  # Intl date/bytes/credits formatting (Africa/Accra)
│       ├── ghs-constants.ts           # Domain truth: regions, directorates, MIME, CPD credits
│       ├── rbac/capabilities.ts       # Capability matrix (role × action → allow/deny)
│       ├── server/
│       │   ├── auth-adapter.ts        # Supabase Auth wrapper
│       │   ├── audit.ts               # Hash-chained immutable audit log
│       │   ├── rbac.ts                # requireSession, requireCapability
│       │   ├── session.ts             # Signed session cookie (SHA-256)
│       │   ├── storage.ts             # Supabase Storage adapter
│       │   └── queries.ts             # Typed DTO queries (no db in components)
│       └── utils.ts                   # cn() helper
```

---

## Getting Started

### 1. Install dependencies

```powershell
cd C:\Users\amkch\Documents\Projects\ghs-etraining-hub
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env.local` and fill in your Supabase values:

```powershell
Copy-Item .env.example .env.local
```

Edit `.env.local`:

| Variable | Source in Supabase Dashboard |
|----------|------------------------------|
| `DATABASE_URL` | Settings → Database → Connection string → Pooler (port 6543) + `?pgbouncer=true` |
| `DIRECT_URL` | Settings → Database → Connection string → Session/Direct (port 5432) + `?sslmode=require` |
| `SESSION_SECRET` | Any 32+ character random string |
| `SUPABASE_URL` | Settings → API → Project URL |
| `SUPABASE_ANON_KEY` | Settings → API → Publishable key (`sb_publishable_...`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Settings → API → Secret key (`sb_secret_...`) |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` |

### 3. Set up the database

```powershell
# Generate Drizzle client
npx drizzle-kit generate

# Push schema to Supabase (sandbox/dev only)
npx drizzle-kit push

# Seed with GHS data
npm run db:seed
```

> **Note:** `drizzle-kit push` requires a direct connection. If port 5432 is blocked by Supabase, temporarily point both `DATABASE_URL` and `DIRECT_URL` to the pooled connection (port 6543) to run the push, then restore `DATABASE_URL` to the pooled URL for runtime.

### 4. Run the dev server

```powershell
npm run dev
```

Open **http://localhost:3000**.

### 5. Health check

```powershell
curl -s http://localhost:3000/api/health
# Expected: {"ok":true,"checks":{"db":"up"},...}
```

---

## Default Seed Account

| Email | Role | Staff PIN |
|-------|------|-----------|
| `admin@ghs.gov.gh` (or `SEED_ADMIN_EMAIL`) | SYSTEM_ADMIN | GHS-000001 |

Seeder reads `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` and refuses to run in production unless `ALLOW_PROD_SEED=true`.

---

## Vercel Deployment

1. Push the repository to GitHub.
2. In Vercel, **Add New Project** → import the GitHub repo.
3. **Build and Output Settings:**
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Root Directory: `ghs-etraining-hub` (or `.` if the repo root is the project)
4. **Environment Variables:** Add all variables from `.env.local` (except `NEXT_PUBLIC_` ones are fine in both).
5. Deploy.

### Supabase Connection via Vercel

When connecting Supabase in Vercel:
- **Working directory / relative path to `supabase/` folder:** `.` (or leave blank if at repo root)
- The `supabase/config.toml` is for local development; production uses your hosted Supabase project.

---

## Key Conventions (from AGENTS.md)

- **Drizzle is the ORM** — no Prisma. Schema lives in `src/db/schema.ts` (TypeScript).
- **No Supabase SDKs in components** — wrap behind `src/lib/server/*` adapters.
- **No `db` in components** — all data access through `src/lib/server/queries.ts` or Server Actions.
- **Server-only modules** start with `import "server-only";`.
- **Auth-deny by default** — every mutation begins with `requireCapability(...)` from `src/lib/server/rbac.ts`.
- **Every mutation writes an audit row** via `logAudit()` in the same transaction.
- **TypeScript strict** — no `any`, no non-null `!` on unverified data.
- **WCAG 2.2 AA** — visible focus rings, ≥44px hit areas, semantic landmarks.
- **Bandwidth-first** — server-rendered HTML, paginated lists, lazy-loaded viewers, signed URLs for media.

---

## Verification Gates (before claiming done)

```powershell
npx next typegen
npm exec tsc -- --noEmit
npm run lint
npm run build
curl -s localhost:3000/api/health
```

---

## License

Internal GHS use.
