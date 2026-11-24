# Database migrations

Two complementary migration streams live in this repository:

| Directory | Owns | Applied by |
| --- | --- | --- |
| `drizzle/` | Tables, columns, enums, indexes, constraints generated from `src/db/schema.ts` | `npm run db:migrate` |
| `supabase/migrations/` | Raw PostgreSQL that Drizzle cannot express: RLS lock-down, grants, triggers | Supabase CLI / `psql`, **after** the Drizzle stream |

`drizzle/` is a versioned artefact: generated SQL and `meta/` snapshots are committed and
reviewed like code. `drizzle-kit push` remains a sandbox-only convenience for iterating on the
schema, never a production step.

## Fresh environment

```bash
export DIRECT_URL="postgresql://postgres.<ref>:…@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require"
npm run db:migrate                       # drizzle/0000_baseline.sql, 0001_…, 0002_…, 0003_…
psql "$DIRECT_URL" -f supabase/migrations/20260113000000_lock_public_api.sql
npm run db:seed
```

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
* `supabase/migrations/` runs last, so a new table needs its RLS lock-down statement added
  there in the same change.

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
