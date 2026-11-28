-- A fourth role: District HR, and the district each person belongs to.
--
-- District HR is an administrator for one district — people, facilities, notices
-- and complaints inside it — and nothing beyond it. Authority of that shape needs
-- a boundary the database can enforce, and a *name* is not one: `users.district`
-- holds whatever the staff sheet wrote ("Wa", "Wa Municipal", trailing spaces),
-- so two rows for the same place can differ and a boundary drawn on it would leak.
-- `users.district_id` is the same fact as a foreign key, resolved below from the
-- names that are already there.
--
-- The enum value is added alone and not used in this file: Postgres allows
-- ADD VALUE inside a transaction, but not for a value written in that same
-- transaction, and every migration here runs in one.
ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'DISTRICT_HR';
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "district_id" uuid;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_district_id_districts_id_fk'
  ) THEN
    ALTER TABLE "users"
      ADD CONSTRAINT "users_district_id_districts_id_fk"
      FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE SET NULL;
  END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_district_id_idx" ON "users" ("district_id");
--> statement-breakpoint
-- Resolve the names already in the table. A district name is unique within its
-- region, so the region name is part of the match; anything that does not match
-- stays null (the person keeps their district as text, and an administrator can
-- set the row by hand) rather than being guessed into the wrong district.
UPDATE "users" u
SET "district_id" = d."id"
FROM "districts" d
JOIN "regions" r ON r."id" = d."region_id"
WHERE u."district_id" IS NULL
  AND u."district" IS NOT NULL
  AND lower(btrim(u."district")) = lower(btrim(d."name"))
  AND (u."region" IS NULL OR lower(btrim(u."region")) = lower(btrim(r."name")));
