# GHS-TL — Ghana Health Service Training Library

The catalogue of record for Ghana Health Service training programmes. Material from a training
session — slides, protocols, videos, references — is filed under the directorate and module that ran
it, as a numbered version that a second reviewer has to approve before staff see it. Nothing is
deleted silently: material is archived, and a hash-chained audit trail records who uploaded,
reviewed, published, downloaded or withdrew it. Built on **Next.js 16**, **React 19**,
**Tailwind CSS v4**, **Drizzle ORM**, **Supabase** (PostgreSQL + Auth + Storage) and **Vercel**.

---

## Architecture summary

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 App Router, React 19 (Turbopack) |
| Styling | Tailwind CSS v4 (`@import "tailwindcss"`, `@theme` tokens, no config file) |
| ORM | Drizzle ORM + `postgres` driver (no Prisma) |
| Database | PostgreSQL (Supabase; transaction pooler on 6543 at runtime) |
| Auth | Supabase Auth via `@supabase/ssr`; role and scope come from `public.users` |
| Storage | Supabase Storage, private bucket, 15-minute signed URLs |
| Edge gate | `src/proxy.ts` (Next 16's successor to `middleware.ts`) |
| Migrations | Drizzle SQL in `drizzle/` + raw SQL in `supabase/migrations/` (see `docs/migrations.md`) |
| Testing | Vitest (unit), Playwright (public + optional credentialled smoke) |
| CI | `.github/workflows/ci.yml` (typecheck, lint, unit tests, build, production audit) |

---

## What is implemented today

**Shipped:** staff sign-in / password reset; dashboard with mandatory protocols; a **catalogue** of
programme fields → areas → material viewer; library search with server-side pagination; progress
(start · acknowledge · complete) with per-version re-acknowledgement; a personal record of what you
opened, downloaded and finished; a **Trainings register** (the Learn section's "Trainings" tab) with a
filter bar, plan form — title, year, programme field and area, target group, region → district →
sub-district → facility, start/end dates, duration, venue — and an audited archive; **training
**trainings** recorded at region → district → sub-district → facility; **traffic insights** (opens, downloads, upload rate, trainings
per programme) drawn as server-rendered SVG charts; staff messaging (paginated threads); notifications;
**authoring pipeline** (draft → signed upload → review → publish → supersede → archive) with the
two-person publish rule; **cohort-targeted notices**; marketing site and the GHS emblem brand set.

**Enforced, not just documented:** capability matrix (role × action × scope), facilitator scope
resolved from `category_facilitators`, cohort visibility (`spaces.audience_*`,
`categories.is_restricted`), hash-chained audit log written in the same transaction as each
mutation, rate limits on progress/messages/certificate lookups, RLS lock-down of the public API.

**Reference data is administrable:** `/programme-fields` (ten fields, forty-one areas from the GHS
list) and `/geography` (regions → districts → sub-districts → facilities) are full CRUD surfaces for
administrators, with archive-instead-of-delete for anything a training already refers to. The
signed-in sidebar is GHS green in both themes (ADR-0013).

**Not built yet:** category/space administration and the audit-log viewer, comments/discussion,
assessments and grading, message reporting, MFA enforcement and account lockout, server-rendered
certificate PDFs, and time-to-publish. The tables exist; the flows do not. See `REPO_ANALYSIS.md`
for the prioritised gap list.

**Retired, deliberately:** CPD points, cycle targets and certificate awarding (ADR-0011). The
`certificates` table, `GHS-CPD-…` serials, `/verify` and the printable award remain, so certificates
already issued still check out; nothing new is issued.

---

## Project structure

```
docs/                          # PRD, architecture, data model, RBAC, UI/UX, conventions, QA, migrations
docs/decisions/**              # architecture decision records
drizzle/**                     # generated + reviewed SQL migrations (versioned)
supabase/migrations/**         # raw SQL: RLS lock-down, grants
scripts/                       # ops scripts (auth provisioning, audit-chain verification)
tests/e2e/**                   # Playwright specs
.github/workflows/ci.yml       # CI gates
next.config.ts                 # security headers (CSP, COOP/CORP, Permissions-Policy), image allowlist
vercel.json                    # build/deploy settings (env vars live in the Vercel project)
drizzle.config.ts              # drizzle-kit (uses DIRECT_URL)
src/
  app/
    (marketing)/               # public: home, programmes, about, verify, legal, contact
    (auth)/                    # login, forgot-password, reset-password
    (dash)/                    # protected shell: dashboard, trainings, catalogue, library,
                               # catalogue, geography, programme-fields, messages, analytics
    api/health/                # liveness/readiness probe
    api/materials/[id]/file/   # audit-logged signed-URL redirect for controlled documents
    auth/callback/             # PKCE code exchange for reset links
  assets/fonts/                # self-hosted Plus Jakarta Sans (SIL OFL 1.1)
  components/{ui,layout,materials,messages,analytics,marketing,auth,brand,theme}/
  db/
    client.ts                  # pooled Drizzle singleton (server-only)
    schema.ts                  # all tables (snake_case columns, camelCase fields)
    seed.ts                    # idempotent seeder
  lib/
    rbac/capabilities.ts       # capability matrix + scope rules (isomorphic, unit-tested)
    viewer.ts                  # Viewer shape, isStaffRole()
    certificate-code.ts        # random serial generation/validation
    file-name.ts               # MIME-correct download names
    format.ts / cpd.ts / ghs-constants.ts / labels.ts / links.ts / names.ts
    server/
      session.ts               # Supabase identity + public.users authority
      rbac.ts                  # requireSession, checkCapability (DB-verified scope)
      audit.ts                 # hash-chained append + chain verifier
      certificates.ts          # frozen certificate serials (ADR-0011: no new issuance)
      rate-limit.ts            # fixed-window limiter over rate_limit_windows
      learning-queries.ts      # catalogue, materials, dashboard, transcript + cohort filters
      messaging-queries.ts     # conversations, paginated threads
      notification-queries.ts  # notices + unread counts
      public-queries.ts        # public stats + certificate verification
      file-storage.ts          # signed URLs for the private bucket
      logger.ts                # one-line JSON events with PII redaction
      request-context.ts       # client IP / user agent
      supabase-server.ts       # cookie-bound Supabase client
      actions/                 # Server Actions: learning, messages, notifications, auth
```

---

## Getting started

```bash
npm ci
cp .env.example .env.local     # then fill in the Supabase values
npm run db:migrate             # drizzle/0000…0003
psql "$DIRECT_URL" -f supabase/migrations/20260113000000_lock_public_api.sql
npm run db:seed
npm run dev                    # http://localhost:3000
```

| Variable | Source |
|---|---|
| `DATABASE_URL` | Supabase → Database → Pooler (port 6543) + `?pgbouncer=true` — runtime only |
| `DIRECT_URL` | Database → **Session pooler** (5432, `sslmode=require`) — drizzle-kit only. `db.<ref>.supabase.co` is IPv6-only now and fails on IPv4 with `ENOTFOUND` |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | API settings (anon key is public-safe) |
| `SUPABASE_SERVICE_ROLE_KEY` | API settings — **server only**, used to sign storage URLs |
| `NEXT_PUBLIC_APP_URL` | The public origin (`http://localhost:3000` locally) |
| `NEXT_PUBLIC_SUPPORT_EMAIL` / `_PHONE` | Optional; the site says how to reach ICT when unset |
| `SEED_ADMIN_EMAIL`, `ALLOW_PROD_SEED` | Seeder only; refuses production by default |

Existing databases that were created with `drizzle-kit push` need the one-time baseline
procedure in `docs/migrations.md` before `db:migrate` will work.

### Updating an existing database

A database created before the registrations and traffic release is missing migration `0003`. The
symptom is a page failing with `relation "material_views" does not exist` (or
`training_sessions`, `districts`). Fix it, then reload:

```bash
npm run db:migrate   # applies drizzle/0003; needs DIRECT_URL
npm run db:seed            # idempotent; taxonomy + geography + starter content and accounts
npm run db:seed:geography  # geography only — safe on a database that already has real people in it
```

`db:seed:geography` exists because the full seeder also creates a demo administrator, a facilitator
and three starter materials. If the app is live and only the district/facility pickers are empty
(`db:doctor` says *"No districts or facilities"*), run the geography command instead: it upserts
regions, the eleven Upper West districts, their sub-districts and 24 facilities, and touches
nothing else.

If the connection itself fails — `getaddrinfo ENOTFOUND`, `ECONNREFUSED`, `CONNECT_TIMEOUT`, or
`read ECONNRESET` — run the doctor first. It checks both URLs, resolves the hosts, connects, and names the fix
without changing anything:

```bash
npm run db:doctor
```

`write CONNECT_TIMEOUT` deserves its own note, because the cause is almost always the host and not the password.
Supabase's direct host, `db.<project-ref>.supabase.co`, resolves **only to IPv6**. On a network without IPv6
(most office Wi-Fi, some ISPs) the TCP handshake never completes, and every query waits out `connect_timeout`.
Use the pooler instead — Supabase → **Connect** → *Session pooler* — which resolves to IPv4:

```dotenv
# wrong on an IPv4-only network: IPv6-only host, connect times out
DATABASE_URL=postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres

# right: Supavisor pooler, IPv4, session mode on 5432 (6543 for transaction mode)
DATABASE_URL=postgresql://postgres.<ref>:<password>@aws-1-<region>.pooler.supabase.com:5432/postgres?sslmode=require&uselibpqcompat=true
```

Check the DNS answer before guessing which of the two is wrong:

```bash
node -e "require('dns').lookup('db.<ref>.supabase.co',{all:true},console.log)"   # [{family:6,…}] explains it
```

`GET /api/health` now reports schema drift directly: `{"ok":false,"checks":{"db":"up","schema":"outdated"},
"missingTables":["material_views"],"error":{"code":"SCHEMA_OUTDATED",…}}`. It answers `503` until the
migration is applied, so a deploy that skips the step is caught by the probe rather than by a user.

### Health check

```bash
curl -s http://localhost:3000/api/health
# {"ok":true,"version":"2.0.0","uptime":…,"checks":{"db":"up"},"latencyMs":…}
```

---

## Deploying to Vercel

The repository is deploy-ready: `vercel.json` declares the framework, `npm ci`, `.next` and
nothing else. **Environment variables are set in the Vercel project, never in `vercel.json`** — a
`@secret` reference that is missing from the project fails the build outright, which is what broke
the first attempt.

1. **Import the repository** (Vercel → Add New → Project → this repo). Framework preset is detected
   as Next.js; leave the build and install commands alone.
2. **Add the variables** under Project → Settings → Environment Variables, for Production *and*
   Preview. Only these six are required to build and boot:

   | Name | Notes |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | inlined at build time — set before the first deploy |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | inlined at build time |
   | `NEXT_PUBLIC_APP_URL` | the production origin, e.g. `https://tl.ghs.gov.gh` (no trailing slash) |
   | `SUPABASE_SERVICE_ROLE_KEY` | server only; used to sign storage URLs |
   | `DATABASE_URL` | Supabase pooler connection string, `?pgbouncer=true` |
   | `DIRECT_URL` | direct connection; needed by `drizzle-kit`, harmless at runtime |

   `NEXT_PUBLIC_SUPPORT_EMAIL` / `NEXT_PUBLIC_SUPPORT_PHONE` are optional. `SEED_ADMIN_EMAIL` and
   `ALLOW_PROD_SEED` belong to local seeding only — do not set them in Vercel.
3. **Deploy**, then smoke-test the deployment:

   ```bash
   curl -s https://<your-domain>/api/health      # {"ok":true,...,"checks":{"db":"up"}}
   ```

   A 503 with `checks.db = "down"` means `DATABASE_URL` is wrong (or the pooler host is not
   reachable from Vercel). The site still renders; only data-backed queries fail.
4. **Point Supabase at the deployment**: Authentication → URL configuration → Site URL and
   `https://<your-domain>/auth/callback` in the redirect allow-list, or password-reset links break.
5. **Create the private storage bucket** `ghs-materials` (Storage → New bucket, public off).
6. **First administrator**: `npm run db:seed` against the production database with
   `ALLOW_PROD_SEED=true` (seed is idempotent), or insert the directory row by hand and run
   `npm run user:create-auth you@ghs.gov.gh`.

Anything `NEXT_PUBLIC_*` changed later needs a redeploy, because it is compiled into the bundle.

---

## Staff logins

1. Insert the directory row (the source of truth for identity and role):

   ```sql
   insert into users (ghs_staff_id, email, full_name, role, region, facility)
   values ('GHS-000123', 'ama.mensah@ghs.gov.gh', 'Ama Serwaa Mensah', 'LEARNER', 'Ashanti', 'Komfo Anokye');
   ```

2. Provision the Auth login (prints a temporary password once; nothing is stored):

   ```bash
   npm run user:provision -- ama.mensah@ghs.gov.gh
   npm run user:provision -- ama.mensah@ghs.gov.gh --reset   # re-issue
   ```

   If Auth has no user at all, `npm run user:create-auth -- ama.mensah@ghs.gov.gh` creates it; if
   someone is locked out before mail delivery works, `npm run user:reset-password -- <email>` sets
   a new password (both read the password from the environment, never from the repository).

3. The staff member signs in and changes the password. Role always comes from the database, never
   from Auth metadata.

Allow `<origin>/auth/callback` in Supabase → Authentication → URL configuration so reset links
work. Create a **private** storage bucket named `ghs-materials` for controlled documents.

---

## Operations

* **Migrations:** `docs/migrations.md`. Schema changes are generated, reviewed and committed;
  `drizzle-kit push` is sandbox-only.
* **Audit integrity:** `npm run db:verify-chain` recomputes the hash chain (exit 1 on tamper).
  Run it after every restore and on a schedule. Staff are deactivated, never deleted — the chain
  covers the actor id.
* **Rate limits:** fixed windows in `rate_limit_windows`, keyed by a SHA-256 of the identifier
  (progress 60/5 min, messages 30/5 min, certificate verification 20/5 min per connection).
  `purgeExpiredRateLimits()` is safe to call from a cron.
* **Security headers:** CSP, COOP/CORP and Permissions-Policy are set in `next.config.ts`; the
  nonce migration is tracked in `docs/decisions/0007-csp-and-headers.md`.
* **Seeding:** `npm run db:seed` upserts (the seed is idempotent); it refuses production unless
  `ALLOW_PROD_SEED=true`.

---

## Verification gates

```bash
npm exec tsc -- --noEmit
npm run lint
npm test
npm run db:check
npm run build
npm run test:e2e:public
npm run db:verify-chain
```

---

## License

Internal GHS use. Fonts: Plus Jakarta Sans, SIL Open Font License 1.1 (`src/assets/fonts/OFL.txt`).
