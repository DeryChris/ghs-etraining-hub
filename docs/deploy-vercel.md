# Deploying GHS-TL to Vercel

A first deployment, start to finish, against the live Supabase project `cnrbtodbgiczblwvfvzq`
(region `eu-west-3`). Every value below is a real one for this project except the database
password and the Supabase keys, which only you have.

**Why Vercel is a fair test of the local connection problem.** Vercel functions run on IPv4-only
networks and reach Supabase through the **transaction pooler on 6543** — the same URL your
`DATABASE_URL` already holds. If pages load there and not on your Windows machine, the fault is
the local network (firewall, antivirus TLS inspection, VPN) rather than the connection string.

---

## 0. Before you start

| Thing | Where | Why |
| --- | --- | --- |
| Repo on GitHub | `DeryChris/ghs-etraining-hub` | Vercel builds from Git |
| The code to deploy | `main` | Vercel's production branch is `main`; this work is on a feature branch, so merge it first |
| Supabase DB password | Supabase → Project Settings → Database | goes in the two connection strings |
| `sb_publishable_…` key | Supabase → Project Settings → API keys | browser-safe anon key |
| `sb_secret_…` key | same page | server-only, signs storage URLs |

Merging first matters: `main` is five commits behind the programme-areas work, so deploying it
today would ship the old taxonomy against the migrated database — the `relation "spaces" does not exist` errors from earlier.

---

## 1. Merge the work into `main`

A pull request is open from `arena/69624470-ghs-etraining-hub`. Merge it on GitHub, then locally:

```bash
git switch main
git pull
npm ci --legacy-peer-deps
npm run typecheck && npm test && npm run build   # the same gates CI runs
```

If you would rather not merge yet, Vercel can deploy the branch itself — every branch gets a
preview URL — but then production stays on the old taxonomy and the two will drift.

---

## 2. Import the project

**Dashboard:** Vercel → **Add New → Project** → import `ghs-etraining-hub`.

**CLI equivalent** (from the repo root):

```bash
npm i -g vercel
vercel login
vercel link          # creates .vercel/ (already gitignored)
```

Settings to confirm on the import screen:

| Setting | Value |
| --- | --- |
| Framework preset | Next.js (auto-detected) |
| Root directory | `./` |
| Build command | `npm run build` (from `vercel.json`) |
| Install command | `npm ci` (from `vercel.json`) |
| Node version | 22.x (from `package.json` `engines`) |

`vercel.json` carries one literal: `NEXT_TURBOPACK=0`, which keeps the production build on
webpack. Never put a **secret** there — a `@name` reference that does not exist in the project
fails the build outright, which is what broke the first attempt.

---

## 3. Environment variables

Project → **Settings → Environment Variables**. Add each one to **Production _and_ Preview**.
`NEXT_PUBLIC_*` values are compiled into the bundle at build time, so they must exist **before**
the first build.

| Name | Value | Notes |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql://postgres.cnrbtodbgiczblwvfvzq:<PASSWORD>@aws-0-eu-west-3.pooler.supabase.com:6543/postgres?sslmode=require&uselibpqcompat=true` | runtime pool, transaction mode |
| `DIRECT_URL` | `…@aws-0-eu-west-3.pooler.supabase.com:5432/postgres?sslmode=require&uselibpqcompat=true` | migrations only; harmless at runtime |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://cnrbtodbgiczblwvfvzq.supabase.co` | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_…` | |
| `SUPABASE_SERVICE_ROLE_KEY` | `sb_secret_…` | **never** prefix with `NEXT_PUBLIC_` |
| `NEXT_PUBLIC_APP_URL` | `https://<your-domain>` | no trailing slash; used in emails and links |
| `DB_POOL_MAX` | `3` | each warm function holds its own pool |

Leave out `SEED_ADMIN_EMAIL` and `ALLOW_PROD_SEED`: those belong to local seeding, and setting
`ALLOW_PROD_SEED` in Vercel removes the seeder's own guard.

`NEXT_PUBLIC_SUPPORT_EMAIL` / `NEXT_PUBLIC_SUPPORT_PHONE` are optional — unset, the contact page
tells visitors how to reach ICT instead of inventing details.

---

## 4. Deploy

```bash
vercel --prod        # CLI
```

or press **Deploy** in the dashboard. The first build takes 2–4 minutes: Next 16, Turbopack off
for the build, ~40 routes.

The build does not need a reachable database — every data-backed page is dynamic. If the build
fails, read the first error rather than the last: a missing `NEXT_PUBLIC_*` shows up as a
prerender failure on `/`, and a bad `DATABASE_URL` does *not* fail the build.

---

## 5. Verify, in this order

```bash
curl -s https://<your-domain>/api/health | jq
```

Expected: `{"ok":true,"checks":{"db":"up","schema":"current"},"latencyMs":…}`.

- `checks.db = "down"` → `DATABASE_URL` is wrong or the pooler is unreachable. The site still
renders; only data-backed queries fail. Compare against the URL `npm run db:doctor` proved
works locally — it is the same pooler host.
- `checks.schema = "outdated"` → migrations are behind. They are already applied to this
database, so seeing this means the deployment points somewhere else.

Then, in a browser:

1. `https://<your-domain>/` renders the marketing page.
2. `/login` accepts a staff account (see step 7 if nobody can sign in).
3. `/dashboard` shows the greeting, numbers and the staff panels.
4. `/catalogue` lists 10 programme fields; Clinical Care → Clinical Service Development shows 1

   material; `/library` shows 10.
5. `/programme-fields` shows 10 fields, 41 areas, and People counts summing to 21.

---

## 6. Point Supabase at the deployment

Supabase → **Authentication → URL configuration**:

- **Site URL:** `https://<your-domain>`
- **Redirect URLs:** add `https://<your-domain>/auth/callback`

Without this, password-reset links bounce to `localhost:3000`. Also add the domain to
**Authentication → Providers → Email** if you later restrict sign-ups.

Storage → **New bucket** → `ghs-materials`, **public off**. The app signs URLs server-side with
the service-role key.

---

## 7. Staff accounts

The live directory already has 7 users. If one of them cannot sign in, the Auth side is missing
rather than the directory row:

```bash
npm run user:create-auth -- someone@ghs.gov.gh    # creates the Auth user if absent
npm run user:provision -- someone@ghs.gov.gh      # prints a one-time temporary password
```

Run these from your machine with `DIRECT_URL` set — they talk to the same database. Nothing
creates a password in the repository.

---

## 8. After the first deploy

- **Redeploy after changing any** `NEXT_PUBLIC_`* **variable.** They are inlined into the bundle; editing
them in the dashboard does nothing until the next build.
- **Migrations** stay a deliberate step: `npm run db:migrate` locally against `DIRECT_URL`, then
redeploy. Do not run `0004`/`0005` again — they are recorded in `drizzle.__drizzle_migrations`.
- **Preview deployments** share the production database by default. If a reviewer should not write
to live data, add a second Supabase project for previews and set the variables per environment.
- **Logs:** Vercel → Deployments → Functions. Every line is one JSON object with an `event` name;
`query.deadline_exceeded` names the section that stalled, and `shell.session_unavailable` means
the app could not reach Postgres at all.

---

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Build fails on `/_not-found` at "Collecting page data" | `NEXT_PUBLIC_APP_URL` is not a URL — usually one character short, e.g. `https//ghstl.vercel.app` | set it to `https://<domain>`. A typo is repaired and logged now, but fix the value: it feeds canonical links and password-reset redirects |
| Build fails on `/` prerender | `NEXT_PUBLIC_SUPABASE_URL` or `ANON_KEY` missing | add both, redeploy |
| `/api/health` → `db: "down"` | wrong password, or `db.<ref>.supabase.co` (IPv6-only) | use the 6543 pooler URL |
| `prepared statement already exists` | `prepare: true` on a pooler | already `prepare: false`; check nobody re-enabled it |
| Pages load but every table is empty | pointed at a different database | compare `/api/health` with `db:doctor` |
| Reset email links to localhost | Supabase Site URL not updated | step 6 |
| `too many connections` after traffic | `DB_POOL_MAX` too high for the instance count | lower it to 1–2 |
| Login loops back to `/login` | cookie domain mismatch | `NEXT_PUBLIC_APP_URL` must match the deployed origin exactly |
