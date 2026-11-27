# GHS-TL — Ghana Health Service Training Library

The library of record for Ghana Health Service training programmes. Material from a training
session — slides, protocols, videos, references — is filed under the directorate and module that ran
it, as a numbered version that a second reviewer has to approve before staff see it. Nothing is
deleted silently: material is archived, and a hash-chained audit trail records who uploaded,
reviewed, published, downloaded or withdrew it. Built on **Next.js 16**, **React 19**,
**Tailwind CSS v4**, **Drizzle ORM**, **Neon Postgres**, any **S3-compatible bucket** and **Vercel**.

---

## Architecture summary

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 App Router, React 19 (Turbopack) |
| Styling | Tailwind CSS v4 (`@import "tailwindcss"`, `@theme` tokens, no config file) |
| ORM | Drizzle ORM + `postgres` driver (no Prisma) |
| Database | Neon Postgres — pooled (`-pooler`) host at runtime, direct host for migrations |
| Auth | bcrypt hash on `users.password_hash` + our own signed `ghs_session` cookie (ADR-0015); role and scope come from `public.users` |
| Storage | any S3-compatible bucket (Neon Object Storage by default), private, 15-minute presigned URLs |
| Edge gate | `src/proxy.ts` (Next 16's successor to `middleware.ts`) |
| Migrations | Drizzle SQL in `drizzle/`, one stream, provable with `npm run db:check-chain` (see `docs/migrations.md`) |
| Testing | Vitest (unit), Playwright (public + optional credentialled smoke) |
| CI | `.github/workflows/ci.yml` (typecheck, lint, unit tests, migration chain, build, production audit) |

---

## What is implemented today

**Shipped:** staff sign-in / password reset; a role-aware dashboard; a **Library** of programme
fields → areas → material viewer; library search with server-side pagination; a reading record of what
you opened and downloaded, per version; a **Trainings** list with a
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
    (dash)/                    # protected shell: dashboard, library (/catalogue), trainings,
                               # review, authoring, users, notices, geography, programme-fields
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
      session.ts               # signed cookie identity + public.users authority
      rbac.ts                  # requireSession, checkCapability (DB-verified scope)
      audit.ts                 # hash-chained append + chain verifier
      certificates.ts          # frozen certificate serials (ADR-0011: no new issuance)
      rate-limit.ts            # fixed-window limiter over rate_limit_windows
      learning-queries.ts      # library, materials, reading record + cohort filters
      messaging-queries.ts     # conversations, paginated threads
      notification-queries.ts  # notices + unread counts
      public-queries.ts        # public stats + certificate verification
      file-storage.ts          # S3 presigned URLs (upload + download) for the private bucket
      logger.ts                # one-line JSON events with PII redaction
      request-context.ts       # client IP / user agent
      auth.ts                  # bcrypt verify, lockout, reset tokens
      actions/                 # Server Actions: learning, messages, notifications, auth
```

---

## Getting started

Node 22 — the version CI and Vercel build with (`engines` in `package.json`). A newer Node runs the
app but is untested against Next 16 here.

```bash
npm ci                          # dev dependencies included: @electric-sql/pglite powers db:check-chain
cp .env.example .env            # then fill in the Neon values below
npm run db:check-chain          # pre-flight: applies every migration to an in-memory Postgres
npm run db:migrate              # against DIRECT_URL
npm run db:seed                 # taxonomy, Upper West geography, starter content
SEED_ADMIN_PASSWORD='…' npm run user:create-auth -- you@ghs.gov.gh
npm run dev                     # http://localhost:3000
```

The operator scripts load **`.env`** through `dotenv`, and Next reads `.env` as well — one file
serves both. A value placed only in `.env.local` is invisible to `db:migrate` and `user:*`.

| Variable | Source |
|---|---|
| `DATABASE_URL` | Neon → **Connect**, *Connection pooling* **on** — the `…-pooler…` host. Used by the app, the seeder and every `user:*` script |
| `DIRECT_URL` | Same screen, pooling **off** — the direct host. `drizzle-kit` only: DDL waits on an advisory lock a transaction-mode pooler never releases |
| `SESSION_SECRET` | `openssl rand -base64 48`. Below 32 characters sign-in refuses to issue a cookie rather than sign one with a guessable key |
| `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | Any S3-compatible bucket (Neon Object Storage, Cloudflare R2, AWS S3, MinIO). Optional: without them every page works and only material uploads/downloads are unavailable |
| `NEXT_PUBLIC_APP_URL` | The public origin (`http://localhost:3000` locally) |
| `NEXT_PUBLIC_SUPPORT_EMAIL` / `_PHONE` | Optional; the site says how to reach ICT when unset |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `ALLOW_PROD_SEED` | Seeder and ops scripts only; the seeder refuses production by default |

Both connection strings need `?sslmode=require`. Neon's newer strings append
`&channel_binding=require` — drop that parameter; the driver neither needs nor uses it.

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

Most connection failures are one of two mistakes, and `npm run db:doctor` names which: the two Neon
hosts swapped (`-pooler` for the app, direct for migrations), or a project that autosuspended after
inactivity, where the first request pays a wake-up. The doctor prints the host, the port and the
driver's errno without ever printing the password.

### Windows: `npm ci` stops with EPERM on a `.node` file

`npm error errno -4048 … unlink …\node_modules\.lightningcss-…\lightningcss.win32-x64-msvc.node`
means something still holds that file open — a running `npm run dev`, an editor's file watcher, or
OneDrive/Defender indexing the folder. `npm ci` deletes `node_modules` first, so one locked file
aborts the whole install.

```powershell
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Remove-Item -Recurse -Force node_modules
npm ci
```

If the removal itself is denied, reboot and retry: a held handle outlives the process list. A project
inside a OneDrive-synced `Documents` folder hits this repeatedly — move it (for example
`C:\src\ghs-etraining-hub`) or exclude the folder from sync.

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

A step-by-step walkthrough with this project's real values, the post-deploy checks and a
troubleshooting table is in [docs/deploy-vercel.md](docs/deploy-vercel.md). The summary:

The repository is deploy-ready: `vercel.json` declares the framework, `npm ci`, `.next` and
nothing else. **Environment variables are set in the Vercel project, never in `vercel.json`** — a
`@secret` reference that is missing from the project fails the build outright, which is what broke
the first attempt.

1. **Import the repository** (Vercel → Add New → Project → this repo). Framework preset is detected
   as Next.js; leave the build and install commands alone.
2. **Add the variables** under Project → Settings → Environment Variables, for Production *and*
   Preview, then set **Settings → Functions → Region** to `fra1`. Only these are required to build
   and boot:

   | Name | Notes |
   | --- | --- |
   | `DATABASE_URL` | Neon **pooled** host (`…-pooler…`), `?sslmode=require` |
   | `SESSION_SECRET` | 32+ random characters; changing it signs everybody out |
   | `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | optional object storage; the endpoint is compiled into the CSP, so changing it needs a redeploy |
   | `NEXT_PUBLIC_APP_URL` | the production origin, e.g. `https://ghstl.vercel.app` (no trailing slash) |
   | `DB_POOL_MAX` | set `3` — each warm function instance holds its own pool |
   | `DIRECT_URL` | optional at runtime; only `drizzle-kit` reads it |

   There are no `SUPABASE_*` variables any more — delete any that remain. `SEED_ADMIN_EMAIL`,
   `SEED_ADMIN_PASSWORD` and `ALLOW_PROD_SEED` belong to local seeding and must not be set on Vercel.
3. **Deploy**, then smoke-test the deployment:

   ```bash
   curl -s https://<your-domain>/api/health | jq                       # checks.db, checks.schema
   curl -s 'https://<your-domain>/api/health?deep=pages' | jq '.probes[] | {label, ms}'
   ```

   A 503 with `checks.db = "down"` means `DATABASE_URL` is wrong or the endpoint is suspended. The
   site still renders; only data-backed queries fail.
4. **Migrate before the first sign-in**: `npm run db:migrate` and `npm run db:seed` with
   `DIRECT_URL`. The build itself needs no database.
5. **Give yourself a password**: `SEED_ADMIN_PASSWORD='…' npm run user:create-auth -- you@ghs.gov.gh`.
6. **Object storage**, if you use it: private bucket `ghs-materials`, CORS allowing `PUT` and `GET`
   from the deployment origin with the `content-type` header.

Anything `NEXT_PUBLIC_*` changed later needs a redeploy, because it is compiled into the bundle.

---

## Staff logins

Staff sign in with their **employee number** — the one printed on the payslip — and the password ICT gave
them. The e-mail is
optional — most of the Upper West payroll has none — and the first sign-in can only choose a new
password (`users.must_change_password`, checked by `proxy.ts`).

### Importing the staffing sheet

The GHS staffing export (employee no., name, cadre, facility, district, sub-district) is imported with
one command. The sheet is **never committed** — it is passed by path and only counts are printed:

```bash
npm run staff:import -- --file "/path/to/Staff Data.csv" --dry-run   # summary only, writes nothing
npm run staff:import -- --file "/path/to/Staff Data.csv"             # geography, then accounts
```

* Geography is matched by name and created when missing: region → district → sub-district → facility.
* Every account is created as `LEARNER` with `must_change_password = true`, so nothing in the
  spreadsheet can hand out review authority by accident. Roles and programme access are assigned
  afterwards in `/users` (Facilitators / Unit heads / Admins, then the access overlay).
* First password: `<employee no.>@123` — deliberately easy to say out loud and replaced on first
  sign-in. It is hashed with bcrypt before it is stored and is never printed or logged.
* Re-running is safe: names, cadre, facility and geography are refreshed; an existing password, role,
  unit-head duty and programme grants are left alone. `--reset-passwords` reissues the default password
  for everyone in the sheet, which is what you want after a bulk hand-over and not otherwise.
* Dirty columns are cleaned, not guessed at: `0` and `2147483647` are not phone numbers, an e-mail that
  is not an address is dropped, and where the sheet repeats one corporate address the first person keeps
  it and the rest sign in by employee number (`users.email` is unique, so a repeat would otherwise fail
  the whole batch). `Upper West`, `Upper West Region` and `UpperWest` are one region.
* Rows are written 100 at a time, inside a transaction with the pool's 30-second statement ceiling lifted.
  A batch that fails is retried, then reported with its Postgres code and a `--from` value to resume at.
* Hashing first passwords is the slow part — bcrypt at cost 12, about a third of a second each — so it
  runs one worker per core and only for people who do not exist yet. Six thousand accounts is a few
  minutes rather than half an hour, and Ctrl-C is safe: re-run and it continues where it stopped.

When a long-running process against the pooled host is not an option — a locked-down laptop, a flaky
connection, or a host that keeps cutting the statement — write the same work as plain SQL instead:

```bash
npm run staff:sql -- --file "/path/to/Staff Data.csv"        # writes staff-accounts.sql
psql "$DIRECT_URL" -f staff-accounts.sql                     # or paste into the Neon SQL editor
```

The file is upserts throughout (`on conflict` on the natural key), so it can be run twice; it keeps
existing passwords, roles and grants; and it is chunked into statements small enough for the SQL editor.
It contains a bcrypt hash per person, so treat it like the sheet itself: `.gitignore` covers
`staff-accounts*.sql`, and delete it once it has run. `--no-passwords` writes the accounts without a
password instead, for `npm run user:password` afterwards.

Personal data from the sheet lives only in the database: `.gitignore` covers `Staff Data.csv`, and the
import writes one audit row for the batch rather than a row per person.

### One account at a time

1. Insert the directory row (the source of truth for identity and role):

   ```sql
   insert into users (ghs_staff_id, email, full_name, role, region, facility)
   values ('GHS-000123', 'ama.mensah@ghs.gov.gh', 'Ama Serwaa Mensah', 'LEARNER', 'Ashanti', 'Komfo Anokye');
   ```

2. Set a password on that row (prints a one-time temporary password; nothing is stored):

   ```bash
   npm run user:provision -- ama.mensah@ghs.gov.gh
   npm run user:provision -- ama.mensah@ghs.gov.gh --reset   # re-issue
   ```

   `npm run user:create-auth -- <email>` sets a known password from `SEED_ADMIN_PASSWORD` instead.
   For a locked-out account, `npm run user:reset-password -- <email>` prints a one-hour, single-use
   `/reset-password?token=…` link to hand over in person — the pilot sends no e-mail, and
   `/forgot-password` says so.

   **Staff accounts are a separate step from the seed.** `db:seed` writes geography, the programme
   taxonomy and one administrator; people come from the GHS staff sheet, which is personal data and is
   never committed. Import it, then check what landed:

   ```bash
   npm run staff:import -- --file "C:\path\to\Staff Data.csv" --dry-run
   npm run staff:import -- --file "C:\path\to\Staff Data.csv"
   npm run staff:status
   ```

   Everyone imported arrives with the **Staff** role (stored as `LEARNER`) and chooses a password at first
   sign-in. `staff:status` prints the counts by role, how many have never signed in and how many can
   actually sign in, and tells you the next command if something is missing.

   To set a password you choose, by e-mail or by employee number (this also clears a lockout):

   ```bash
   npm run user:password -- --email ama.mensah@ghs.gov.gh --password='a long phrase'
   npm run user:password -- --id GHS-000042 --password='a long phrase'
   npm run user:password -- 42 'a long phrase'          # positional, same as --id
   ```

   Add `--must-change` to make them pick a new one at next sign-in, or `--dry-run` to see which
   account the identifier resolves to without touching it. The password is never echoed or logged.

3. The staff member signs in at `/login` and can set a new password from that link. Role always comes
   from `public.users`, never from anything the account holder can edit. There is no third-party auth
   service: `password_hash` is a bcrypt hash on the row (ADR-0015).

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
