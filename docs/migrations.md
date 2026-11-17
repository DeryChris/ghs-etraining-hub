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
export DIRECT_URL="postgresql://postgres.<ref>:ΓÇª@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require"
npm run db:migrate                       # drizzle/0000_baseline.sql, 0001_ΓÇª, 0002_ΓÇª, 0003_ΓÇª
psql "$DIRECT_URL" -f supabase/migrations/20260113000000_lock_public_api.sql
npm run db:seed
```

## Environment that was previously created with `drizzle-kit push`

Such a database has the tables but no `drizzle.__drizzle_migrations` history. Do **not** run
`db:migrate` blindly: `0000_baseline.sql` would try to create existing tables.

1. Compare the live schema with `drizzle/0000_baseline.sql` (or run `npx drizzle-kit check`).
2. Apply the delta by hand, in order ΓÇö `0001_integrity_and_indexes.sql` is written to be
   re-runnable against an existing schema. Check for duplicates first; the two `UNIQUE`
   constraints will fail on dirty data (the header of that file has the queries).
3. Record the applied migrations in `drizzle.__drizzle_migrations` so future runs start at the
   right point (insert the two journal rows with their `created_at` timestamps from
   `drizzle/meta/_journal.json`).

From that point on, every schema change is: edit `src/db/schema.ts` ΓåÆ `npm run db:generate` ΓåÆ
review the SQL ΓåÆ `npm run db:migrate` in each environment.

## Rules

* One migration per logical change, with a descriptive `--name`.
* Never edit a migration that has been applied anywhere; add a new one.
* Destructive changes (`DROP TABLE`, `DROP COLUMN`, `SET NOT NULL`) ship with their data
  back-fill in the same migration and are called out in the PR description.
* `supabase/migrations/` runs last, so a new table needs its RLS lock-down statement added
  there in the same change.
