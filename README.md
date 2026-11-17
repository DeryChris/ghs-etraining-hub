# GHS-TL ΓÇö Ghana Health Service Training Library

The catalogue of record for Ghana Health Service training programmes. Material from a training
session ΓÇö slides, protocols, videos, references ΓÇö is filed under the directorate and module that ran
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

**Shipped:** staff sign-in / password reset; dashboard with mandatory protocols; directorates ΓåÆ
spaces ΓåÆ material viewer; library search with server-side pagination; progress
(start ┬╖ acknowledge ┬╖ complete) with per-version re-acknowledgement; a personal record of what you
opened, downloaded and finished; **training sessions** recorded under a programme at region ΓåÆ
district ΓåÆ sub-district ΓåÆ facility; **traffic insights** (opens, downloads, upload rate, trainings
per programme) drawn as server-rendered SVG charts; staff messaging (paginated threads); notifications;
**authoring pipeline** (draft ΓåÆ signed upload ΓåÆ review ΓåÆ publish ΓåÆ supersede ΓåÆ archive) with the
two-person publish rule; **cohort-targeted notices**; marketing site and the GHS emblem brand set.

**Enforced, not just documented:** capability matrix (role ├ù action ├ù scope), facilitator scope
resolved from `category_facilitators`, cohort visibility (`spaces.audience_*`,
`categories.is_restricted`), hash-chained audit log written in the same transaction as each
mutation, rate limits on progress/messages/certificate lookups, RLS lock-down of the public API.

**Not built yet:** category/space administration and the audit-log viewer, comments/discussion,
assessments and grading, message reporting, MFA enforcement and account lockout, server-rendered
certificate PDFs, and time-to-publish. The tables exist; the flows do not. See `REPO_ANALYSIS.md`
for the prioritised gap list.

**Retired, deliberately:** CPD points, cycle targets and certificate awarding (ADR-0011). The
`certificates` table, `GHS-CPD-ΓÇª` serials, `/verify` and the printable award remain, so certificates
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
    (dash)/                    # protected shell: dashboard, directorates, spaces, library,
                               # materials, messages, notifications, analytics
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
npm run db:migrate             # drizzle/0000ΓÇª0003
psql "$DIRECT_URL" -f supabase/migrations/20260113000000_lock_public_api.sql
npm run db:seed
npm run dev                    # http://localhost:3000
```

| Variable | Source |
|---|---|
| `DATABASE_URL` | Supabase ΓåÆ Database ΓåÆ Pooler (port 6543) + `?pgbouncer=true` ΓÇö runtime only |
| `DIRECT_URL` | Database ΓåÆ **Session pooler** (5432, `sslmode=require`) ΓÇö drizzle-kit only. `db.<ref>.supabase.co` is IPv6-only now and fails on IPv4 with `ENOTFOUND` |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | API settings (anon key is public-safe) |
| `SUPABASE_SERVICE_ROLE_KEY` | API settings ΓÇö **server only**, used to sign storage URLs |
| `NEXT_PUBLIC_APP_URL` | The public origin (`http://localhost:3000` locally) |
| `NEXT_PUBLIC_SUPPORT_EMAIL` / `_PHONE` | Optional; the site says how to reach ICT when unset |
| `SEED_ADMIN_EMAIL`, `ALLOW_PROD_SEED` | Seeder only; refuses production by default |

Existing databases that were created with `drizzle-kit push` need the one-time baseline
procedure in `docs/migrations.md` before `db:migrate` will work.

### Updating an existing database

A database created before the sessions and traffic release is missing migration `0003`. The
symptom is a page failing with `relation "material_views" does not exist` (or
`training_sessions`, `districts`). Fix it, then reload:

```bash
npm run db:migrate   # applies drizzle/0003; needs DIRECT_URL
npm run db:seed      # idempotent; loads the Upper West geography used by the sessions form
```

If the connection itself fails — `getaddrinfo ENOTFOUND`, `ECONNREFUSED`, or `read ECONNRESET` — run the
doctor first. It checks both URLs, resolves the hosts, connects twice (with `pg`, the driver
drizzle-kit uses, and with postgres.js, the driver the app uses), and names the fix without changing
anything:

```bash
npm run db:doctor
```

`Error: self-signed certificate in certificate chain` (`SELF_SIGNED_CERT_IN_CHAIN`) is not a wrong
password or a wrong host: the URL is fine, the machine's trust store is not. Antivirus HTTPS
scanning, a corporate proxy (Zscaler, Netskope) and similar products re-sign TLS with a root Node
does not know, so node-postgres — which since v8.11 treats `sslmode=require` as `verify-full` —
rejects the chain. `drizzle.config.ts` therefore applies `sslmode=require` with libpq semantics
(encrypted, chain not verified), which is exactly the trust level the app's runtime driver already
uses, so `db:migrate`, `db:push` and `db:studio` connect wherever the app connects. To verify
instead, say so: `sslmode=verify-full&sslrootcert=<path-to-inspecting-ca>.pem`.

`GET /api/health` now reports schema drift directly: `{"ok":false,"checks":{"db":"up","schema":"outdated"},
"missingTables":["material_views"],"error":{"code":"SCHEMA_OUTDATED",ΓÇª}}`. It answers `503` until the
migration is applied, so a deploy that skips the step is caught by the probe rather than by a user.

### Health check

```bash
curl -s http://localhost:3000/api/health
# {"ok":true,"version":"2.0.0","uptime":ΓÇª,"checks":{"db":"up"},"latencyMs":ΓÇª}
```

---

## Deploying to Vercel

The repository is deploy-ready: `vercel.json` declares the framework, `npm ci`, `.next` and
nothing else. **Environment variables are set in the Vercel project, never in `vercel.json`** ΓÇö a
`@secret` reference that is missing from the project fails the build outright, which is what broke
the first attempt.

1. **Import the repository** (Vercel ΓåÆ Add New ΓåÆ Project ΓåÆ this repo). Framework preset is detected
   as Next.js; leave the build and install commands alone.
2. **Add the variables** under Project ΓåÆ Settings ΓåÆ Environment Variables, for Production *and*
   Preview. Only these six are required to build and boot:

   | Name | Notes |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | inlined at build time ΓÇö set before the first deploy |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | inlined at build time |
   | `NEXT_PUBLIC_APP_URL` | the production origin, e.g. `https://tl.ghs.gov.gh` (no trailing slash) |
   | `SUPABASE_SERVICE_ROLE_KEY` | server only; used to sign storage URLs |
   | `DATABASE_URL` | Supabase pooler connection string, `?pgbouncer=true` |
   | `DIRECT_URL` | direct connection; needed by `drizzle-kit`, harmless at runtime |

   `NEXT_PUBLIC_SUPPORT_EMAIL` / `NEXT_PUBLIC_SUPPORT_PHONE` are optional. `SEED_ADMIN_EMAIL` and
   `ALLOW_PROD_SEED` belong to local seeding only ΓÇö do not set them in Vercel.
3. **Deploy**, then smoke-test the deployment:

   ```bash
   curl -s https://<your-domain>/api/health      # {"ok":true,...,"checks":{"db":"up"}}
   ```

   A 503 with `checks.db = "down"` means `DATABASE_URL` is wrong (or the pooler host is not
   reachable from Vercel). The site still renders; only data-backed queries fail.
4. **Point Supabase at the deployment**: Authentication ΓåÆ URL configuration ΓåÆ Site URL and
   `https://<your-domain>/auth/callback` in the redirect allow-list, or password-reset links break.
5. **Create the private storage bucket** `ghs-materials` (Storage ΓåÆ New bucket, public off).
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

Allow `<origin>/auth/callback` in Supabase ΓåÆ Authentication ΓåÆ URL configuration so reset links
work. Create a **private** storage bucket named `ghs-materials` for controlled documents.

---

## Operations

* **Migrations:** `docs/migrations.md`. Schema changes are generated, reviewed and committed;
  `drizzle-kit push` is sandbox-only.
* **Audit integrity:** `npm run db:verify-chain` recomputes the hash chain (exit 1 on tamper).
  Run it after every restore and on a schedule. Staff are deactivated, never deleted ΓÇö the chain
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
