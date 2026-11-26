-- 0012_staff_directory_and_first_login.sql
-- Two changes that belong together:
--
--  1. Staff sign in with their employee number. Most of the Upper West payroll
--     has no work e-mail on file, so `email` can no longer be mandatory — an
--     account without one is normal, not broken.
--  2. Accounts handed out by ICT start on a password somebody else chose, so the
--     first sign-in has to ask for a new one before anything else works.

ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;
ALTER TABLE "users" ALTER COLUMN "email" DROP DEFAULT;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "must_change_password" boolean NOT NULL DEFAULT false;

-- Where the person works, as the payroll sheet names it. `region` and `facility`
-- already existed; district and sub-district make the directory filterable down
-- to the level a district director actually manages.
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "district" text,
  ADD COLUMN IF NOT EXISTS "sub_district" text,
  ADD COLUMN IF NOT EXISTS "gender" text;

CREATE INDEX IF NOT EXISTS "users_district_idx" ON "users" ("district");

-- Case-insensitive employee-number lookup: people type "112755", never a prefix.
CREATE INDEX IF NOT EXISTS "users_staff_id_lower_idx" ON "users" (lower("ghs_staff_id"));
