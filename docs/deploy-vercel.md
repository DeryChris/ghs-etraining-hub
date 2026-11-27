# Deploying GHS-TL to Vercel (Neon Postgres + S3-compatible storage)

Start to finish: a Neon project, a private bucket, a Vercel project, and a staff account that can
actually sign in. The application no longer uses Supabase for anything — not the database, not the
auth, not the files — so every value below comes from Neon or from this repository's own scripts.

---

## 1. Choose the region first (both halves of it)

Two independent latencies decide whether a signed-in tab feels instant or stuck:

| Hop | What it costs | Where you control it |
| --- | --- | --- |
| Accra → Vercel function | first byte of every request | Vercel Project → Settings → Functions → **Function Region** |
| Function → Postgres | every query, and a page makes several | the Neon project's region, fixed at creation |

They must be in the **same city**, or the second hop is paid on every query and no amount of
caching hides it. Neon's regions that also have a Vercel region in the same metro:

| Neon region | Vercel region | Same metro | Roughly Accra → function |
| --- | --- | --- | --- |
| `eu-central-1` (Frankfurt) | `fra1` | ✅ | 100–130 ms |
| `us-east-1` (N. Virginia) | `iad1` | ✅ | 190–230 ms |
| `us-east-2` (Ohio) | `cle1` | ✅ (Cleveland↔Ohio) | 200–240 ms |
| `ap-southeast-1` (Singapore) | `sin1` | ✅ | 230–280 ms |

**Recommendation: Neon `eu-central-1` + Vercel `fra1`.** There is no West-Africa region on either
side, so Frankfurt is the shortest hop that exists for Ghana, and it keeps the function→database leg
at well under a millisecond of network time — that is the leg that repeats several times per page.

Pick `eu-central-1` even if you plan to add object storage later: Neon's object storage offers
`eu-central-1`, `us-east-1`, `us-east-2` and `ap-southeast-1`, and `eu-central-1` is in that list.
(`cpt1` Cape Town is closer to Accra for the *first* hop — about 40–60 ms — but Neon has no African
region, so every query would pay ~150 ms to Europe. Net loss on any page that reads more than one
table, which is all of them.)

---

## 2. Create the Neon project

Neon console → **New project**:

| Field | Value |
| --- | --- |
| Region | **AWS eu-central-1 (Frankfurt)** |
| Postgres version | 17 (16+ required by `drizzle/0000_baseline.sql`) |
| Database name | `neondb` (any name; use it consistently below) |

From **Connect**, copy **two** strings — the difference is not cosmetic:

| Purpose | Host | Used for |
| --- | --- | --- |
| App runtime | `ep-<name>-<id>-pooler.eu-central-1.aws.neon.tech` | `DATABASE_URL` |
| Migrations & scripts | `ep-<name>-<id>.eu-central-1.aws.neon.tech` | `DIRECT_URL` |

The pooled host is PgBouncer in transaction mode: every Vercel instance is its own client, and
without it a handful of cold starts exhausts the project's connection limit. DDL does not survive a
transaction-mode pooler, so migrations take the direct host.

Both strings need `?sslmode=require`.

---

## 3. Apply the migrations, then seed

Run these from your machine, with `DIRECT_URL` set to the **direct** host:

```bash
npm run db:check-chain   # proves all 11 migrations apply to an empty database, no server needed
npm run db:migrate       # against DIRECT_URL
npm run db:seed          # taxonomy + the 7 staff rows (refuses production unless ALLOW_PROD_SEED=true)
```

`db:check-chain` runs the whole `drizzle/meta/_journal.json` order against an in-process Postgres.
It is the check that catches a migration file that exists on disk but is missing from the journal —
`0009_users_password_hash` was exactly that for a while, and `db:migrate` silently skipped it.

Then confirm the two columns the login path needs actually exist:

```sql
select column_name from information_schema.columns
where table_name = 'users' and column_name like 'password%';
-- password_hash, password_reset_token, password_reset_expires_at
```

---

## 4. Create the storage bucket

Neon console → **Object storage** → create a bucket named **`ghs-materials`**, private, in the same
region. Then create an access key and note the **endpoint**, the **key id** and the **secret**.

The browser talks to the bucket directly through short-lived presigned URLs (15 minutes), because
Vercel caps function request bodies far below the 15 MB a PDF may legitimately be. Two consequences
that are easy to miss:

1. **CORS must allow the deployment origin.** Allow `PUT` and `GET` from `https://<your-domain>`
   with the `content-type` header. Without it the upload fails with an opaque network error and
   nothing appears in the server logs.
2. **The endpoint is compiled into the Content-Security-Policy** at build time (`next.config.ts`
   reads `S3_ENDPOINT`). Change the endpoint and you must redeploy, or the browser blocks the
   upload that the server just signed.

If you would rather use AWS S3 or Cloudflare R2, nothing in the code changes: set `S3_ENDPOINT`,
`S3_REGION`, `S3_BUCKET` and the two keys, and `S3_FORCE_PATH_STYLE=false` for AWS.

---

## 5. Import the Vercel project

**Dashboard:** Vercel → **Add New → Project** → import `ghs-etraining-hub`.

| Setting | Value |
| --- | --- |
| Framework preset | Next.js (auto-detected) |
| Root directory | `./` |
| Build command | `npm run build` (from `vercel.json`) |
| Install command | `npm ci` (from `vercel.json`) |
| Node version | 22.x (from `package.json` `engines`) |
| **Function Region** | **`fra1`** (Settings → Functions) |

Set the function region *before* the first production deploy. Changing it later is a redeploy of
every function, and in the meantime every query pays the round trip twice.

`vercel.json` carries one literal: `NEXT_TURBOPACK=0`, which keeps the production build on webpack.
Never put a secret there.

---

## 6. Environment variables

Project → **Settings → Environment Variables**. Add each to **Production _and_ Preview**.
`NEXT_PUBLIC_*` values are inlined at build time, so they must exist **before** the first build.

| Name | Value | Notes |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql://<user>:<pw>@ep-…-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require` | runtime pool — the **`-pooler`** host |
| `DIRECT_URL` | `postgresql://<user>:<pw>@ep-….eu-central-1.aws.neon.tech/neondb?sslmode=require` | migrations only; harmless at runtime |
| `SESSION_SECRET` | 32+ random bytes, e.g. `openssl rand -base64 48` | signs the `ghs_session` cookie; changing it signs everybody out |
| `S3_ENDPOINT` | `https://<bucket-endpoint>` | also feeds the CSP at build time |
| `S3_REGION` | `eu-central-1` | must match the bucket |
| `S3_BUCKET` | `ghs-materials` | private |
| `S3_ACCESS_KEY_ID` | from Neon object storage | server only |
| `S3_SECRET_ACCESS_KEY` | from Neon object storage | **never** prefix with `NEXT_PUBLIC_` |
| `NEXT_PUBLIC_APP_URL` | `https://ghstl.vercel.app` | no trailing slash; feeds canonical links and reset links |
| `DB_POOL_MAX` | `3` | each warm function holds its own pool |

Deliberately **not** set on Vercel: `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `ALLOW_PROD_SEED`.
Setting `ALLOW_PROD_SEED` removes the seeder's own guard against writing to production.

There are no `SUPABASE_*` variables any more. If any are still in the project, delete them — nothing
reads them, and leaving them implies an integration that is no longer there.

---

## 7. Deploy

```bash
vercel --prod
```

The build does not need a reachable database: every data-backed page is dynamic. A missing
`NEXT_PUBLIC_*` shows up as a prerender failure on `/`; a bad `DATABASE_URL` does **not** fail the
build.

---

## 8. Verify, in this order

```bash
curl -s https://<your-domain>/api/health | jq
```

Expected: `{"ok":true,"checks":{"db":"up","schema":"current"},"latencyMs":…}`.

Then the deeper probe, which runs the page data functions themselves rather than stand-ins:

```bash
curl -s 'https://<your-domain>/api/health?deep=pages' | jq '.probes[] | {label, ms, detail}'
```

`session (cookie + sessions table)` and the five `page:` lines must be milliseconds, not timeouts.
That list is the difference between "the database answers" and "the tab loads".

In a browser:

1. `/` renders the marketing page.
2. `/login` accepts a staff account (step 9 if nobody can sign in).
3. `/dashboard` shows the greeting, numbers and staff panels.
4. `/catalogue` is the Library: it lists the programme fields, and search returns the materials.
5. `/trainings`, `/complaints`, `/users` open without sitting on skeletons.

---

## 9. Staff accounts

The directory rows come from the seeder; the **password** is a bcrypt hash on that row, written by
these scripts. Nothing is created in any third-party service.

```bash
SEED_ADMIN_PASSWORD='…' npm run user:create-auth -- you@ghs.gov.gh   # set a known password
npm run user:provision -- someone@ghs.gov.gh                        # print a one-time temp password
npm run user:provision -- someone@ghs.gov.gh --reset                # replace it
npm run user:reset-password -- locked.out@ghs.gov.gh                # print a one-time reset link
npm run user:password -- --email someone@ghs.gov.gh --password='…'  # set a password you choose
npm run user:password -- --id GHS-000042 --password='…'             # …by employee number
```

`user:password` resolves the account by e-mail, employee number (`GHS-000042`, `000042` or `42`) or
UUID, hashes with the same bcrypt cost the application uses, clears the failed-attempt counters and
the lockout, and never prints the secret. `--must-change` forces a change at next sign-in; `--dry-run`
shows which account matched without changing anything.

`user:reset-password` writes only a SHA-256 hash of the token, with a one-hour expiry, and prints a
`/reset-password?token=…` URL. Hand it over in person or over WhatsApp: the pilot sends no e-mail,
and `/forgot-password` says so rather than promising a mail that never arrives.

---

## 10. After the first deploy

- **Redeploy after changing any `NEXT_PUBLIC_*` value or `S3_ENDPOINT`.** They are compiled into the
  bundle; editing them in the dashboard does nothing until the next build.
- **Migrations stay a deliberate step:** `npm run db:migrate` against `DIRECT_URL`, then redeploy.
- **Preview deployments** share the production database by default. If a reviewer must not write to
  live data, branch the Neon project (Neon supports copy-on-write branches) and point Preview at it.
- **Logs:** Vercel → Deployments → Functions. Every line is one JSON object with an `event` name;
  `query.deadline_exceeded` names the section that stalled, `shell.session_unavailable` means the
  app could not reach Postgres at all.
- **Neon autosuspend:** a free plan project suspends after inactivity. The first request after that
  pays a wake-up of a second or two. `/api/health` is a cheap way to warm it before a demo.

---

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `/api/health` → `db: "down"` | wrong password, or the endpoint is suspended | `npm run db:doctor` prints the host, port and the exact errno |
| `db: "down"` and host shows no `-pooler` | direct host in `DATABASE_URL` | each instance opens its own connection; use the pooled host |
| Migrations hang or deadlock | `DIRECT_URL` points at the pooled host | use the direct host for `db:migrate` |
| `password authentication failed` after a Neon reset | password rotated in the console | update both URLs in Vercel, redeploy |
| Upload fails with no server log line | bucket CORS, or `S3_ENDPOINT` changed without a redeploy | allow `PUT`/`GET` from the deployment origin; redeploy |
| Upload 403 from the bucket | signed URL expired (15 min) or the key was rotated | retry; keys are server-side only |
| Tabs sit on skeletons while `/api/health` is green | function region ≠ database region | pair `fra1` with `eu-central-1` (step 1) |
| `too many connections` under load | `DB_POOL_MAX` too high for the instance count | 3 or lower; the pooler fans out behind it |
| Login loops back to `/login` | cookie not accepted | `NEXT_PUBLIC_APP_URL` must match the deployed origin exactly, and `SESSION_SECRET` must be stable across deploys |
| Login says the server could not reach the directory | Postgres unreachable from the function | check the region pairing and `DB_POOL_MAX` |
| Reset link says "expired" immediately | token already used, or `NEXT_PUBLIC_APP_URL` points at another host | issue a new one; links are single-use |
