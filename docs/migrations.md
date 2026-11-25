# Database migrations

One migration stream lives in this repository: `drizzle/`. It owns tables, columns, enums, indexes
and constraints generated from `src/db/schema.ts`, plus the hand-written SQL that drizzle-kit cannot
express, and it is applied by `npm run db:migrate`.

`drizzle/` is a versioned artefact: generated SQL and `meta/` snapshots are committed and reviewed
like code. `drizzle-kit push` remains a sandbox-only convenience for iterating on the schema, never a
production step.

The second stream that used to exist — `supabase/migrations/`, raw RLS and grants to lock down
PostgREST — was deleted with the move to Neon (ADR‑0015). Neon exposes no auto-generated API, and the
application connects as the table owner, for whom row-level security never applied. Nothing enforces
row access in the database now; it is enforced in `src/lib/server/rbac.ts` and re-checked in every
action. That is a real change in where the guarantee lives, and the reason every query goes through a
scoped module rather than raw SQL in a page.

## Proving the chain before touching a database

```bash
npm run db:check-chain
```

Applies every migration in `drizzle/meta/_journal.json` order to an in-process Postgres (PGlite) and
fails if a file is missing, if any statement errors, or if a column in `schema.ts` (currently the
three `password_*` columns on `users`) has no migration creating it. No server, no credentials, no
network — so it belongs in CI, and it is the check that catches the failure mode that actually bit
this repository: a migration file present on disk but absent from the journal, which
`db:migrate` skips in silence.

## Fresh environment

```bash
export DIRECT_URL="postgresql://<user>:<pw>@ep-<name>-<id>.<region>.aws.neon.tech/neondb?sslmode=require"
npm run db:check-chain   # no server needed: prove the journal before trusting the live database
npm run db:migrate       # drizzle/0000_baseline.sql … 0010_password_reset_tokens.sql
npm run db:seed
```

`DIRECT_URL` must be the **direct** Neon host, not the `-pooler` one: PgBouncer in transaction mode
does not hold the advisory locks DDL takes. `DATABASE_URL` (the app) wants the pooled host. Swapping
them is the most common Neon mistake, and `npm run db:doctor` calls it out by name.

## Environment that was previously created with `drizzle-kit push`

Such a database has the tables but no `drizzle.__drizzle_migrations` history. Do **not** run
`db:migrate` blindly: `0000_baseline.sql` would try to create existing tables.

1. Compare the live schema with `drizzle/0000_baseline.sql` (or run `npx drizzle-kit check`).
2. Apply the delta by hand, in order — `0001_integrity_and_indexes.sql` is written to be
   re-runnable against an existing schema. Check for duplicates first; the two `UNIQUE`
   constraints will fail on dirty data (the header of that file has the queries).
3. Record the applied migrations in `drizzle.__drizzle_migrations` so future runs start at the
   right point (insert the two journal rows with their `created_at` timestamps from
   `drizzle/meta/_journal.json`).

From that point on, every schema change is: edit `src/db/schema.ts` → `npm run db:generate` →
review the SQL → `npm run db:migrate` in each environment.

## Rules

* One migration per logical change, with a descriptive `--name`.
* Never edit a migration that has been applied anywhere; add a new one.
* Destructive changes (`DROP TABLE`, `DROP COLUMN`, `SET NOT NULL`) ship with their data
  back-fill in the same migration and are called out in the PR description.
* A migration that adds a file must add its journal entry (`drizzle/meta/_journal.json`) in the same
  change — `db:check-chain` fails loudly if it does not.
* There is no RLS safety net any more: a new table is readable through any query that forgets its
  scope. Follow the module pattern in `src/lib/server/*-queries.ts` and let the tests catch the rest.

The programme-areas cutover of 17 November 2026 has its own note: [cutover-2026-11-17](cutover-2026-11-17-programme-areas.md).

## Applied migrations carry a hash

`drizzle.__drizzle_migrations` stores a SHA-256 of each migration file. If a file is edited
after it has been applied anywhere — including a fix applied during rollout — that hash no
longer matches and `drizzle-kit migrate` will try to run the file again.

`0005_programme_areas_replace_spaces.sql` is in exactly that state. Its first version expanded
`category_facilitators` with a straight `SELECT`, which collided on `area_facilitators_unique_idx`
wherever two directorate grants mapped into the same area (live data did; the PGlite fixture did
not). The fix — `SELECT DISTINCT a.id, cf.user_id` — went in and the migration was applied as
`programme_areas_replace_spaces_v2`, so the live hash is the pre-fix one.

Until the database is recreated from scratch, treat `0005` as already applied: never re-run it,
and if a future environment is built by `drizzle-kit migrate` from zero, that run is the one that
produces a matching hash. Do not "fix" the recorded hash by hand.
