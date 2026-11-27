-- Applying the four pending migrations from the Neon SQL editor.
--
-- For when `npm run db:migrate` is not available (no terminal, or a machine that
-- cannot reach the database). Run this ONCE on the database that `/api/health`
-- reports as `SCHEMA_BEHIND`, then reload `/api/health` — it should say 24 of 24.
--
-- This file carries 0019–0022. Migration 0023 is separate: run
-- `docs/apply-0023.sql` afterwards (it is safe to run on its own).
--
-- It does what drizzle does, in the same order, and records the same ledger rows
-- (`drizzle.__drizzle_migrations`: sha256 of the file, plus the journal stamp), so a
-- later `npm run db:migrate` finds nothing to do instead of trying to re-apply 0019
-- on a database that has already had it.
--
-- Everything is in one transaction: if any statement fails, nothing changes.
-- Running it a second time stops at the first statement with a readable message
-- instead of half-applying anything.

BEGIN;

-- Refuse to start if this has already been done. Without this, a second run gets
-- as far as 0022 and fails on `column "cadre" does not exist`, which reads like a
-- new problem rather than a repeat.
DO $$
DECLARE newest bigint;
BEGIN
  SELECT max(created_at) INTO newest FROM drizzle.__drizzle_migrations;
  IF newest IS NOT NULL AND newest >= 1796400000000 THEN
    RAISE EXCEPTION 'Nothing to do: migrations 0019-0022 are already recorded (newest stamp %).', newest
      USING HINT = 'Reload /api/health — it should now report 23 of 23 migrations.';
  END IF;
END $$;

-- ─── 0019_complaint_training_and_document_issues ─────────────────
-- 0019_complaint_training_and_document_issues.sql
-- Two complaints that were being filed under the wrong heading. "A material will
-- not open" and "the wrong file is attached" were both landing in COURSE_RELATED,
-- so the desk had to read the description to know whether to fetch an object or
-- ask for a replacement. They get their own names, and a complaint that is about
-- a file records which training it belongs to — the title as well as the id, so
-- the record still reads correctly if the training is withdrawn later.
ALTER TYPE "complaint_issue" ADD VALUE IF NOT EXISTS 'WRONG_DOCUMENT';
ALTER TYPE "complaint_issue" ADD VALUE IF NOT EXISTS 'DOC_INACCESSIBLE';

ALTER TABLE "complaints" ADD COLUMN IF NOT EXISTS "training_id" uuid;
ALTER TABLE "complaints" ADD COLUMN IF NOT EXISTS "training_title" text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'complaints_training_id_training_sessions_id_fk'
  ) THEN
    ALTER TABLE "complaints"
      ADD CONSTRAINT "complaints_training_id_training_sessions_id_fk"
      FOREIGN KEY ("training_id") REFERENCES "training_sessions"("id") ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "complaints_training_idx" ON "complaints" ("training_id");

INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
  SELECT 'cba8b11ce64a2d147def40d179eb5df0d24a0a9cc4f801915ca9de0e883eb2e3', 1796400000000
  WHERE NOT EXISTS (SELECT 1 FROM drizzle.__drizzle_migrations WHERE created_at = 1796400000000);

-- ─── 0020_retire_the_marks ───────────────────────────────────────
-- 0020_retire_the_marks.sql
-- Pre/post tests and their marks leave the product.
--
-- The library is an information service: people find the material for a training
-- they attended, read it, download it, and acknowledge the protocols that ask for
-- a signature. It never graded anybody, and the machinery for grading was still
-- here — question banks, attempts, pass marks, best scores, a "scores post to your
-- transcript" page — which read as a credential nobody had promised. ADR-0026.
--
-- Nothing references these tables any more, and none of them was ever populated
-- from the staff sheet or the seed. A material may still be of type
-- ASSESSMENT_LINK or LAB: a training can attach the paper a facilitator hands out,
-- and that is a document like any other. What goes is the marking.
DROP TABLE IF EXISTS "assessment_attempts";
DROP TABLE IF EXISTS "assessment_items";
DROP TABLE IF EXISTS "assessments";

INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
  SELECT 'e1f9c013d214119ef7c09a41dc43e39c43693947d469714ba833c28f09c5cde5', 1796500000000
  WHERE NOT EXISTS (SELECT 1 FROM drizzle.__drizzle_migrations WHERE created_at = 1796500000000);

-- ─── 0021_retire_the_signature ───────────────────────────────────
-- 0021_retire_the_signature.sql
-- "Waiting for your signature" leaves the product, and so does everything that
-- existed only to make it work.
--
-- The library is where people read what GHS published for them. A protocol that
-- asked somebody to press a button saying they had read the current version was
-- a second kind of record — a claim about a person, kept in the same database as
-- the material — and it brought three pieces of machinery with it:
--
--   * material_progress: one row per person per material, holding the version
--     they signed against. Nothing else ever read or wrote it.
--   * enrollments: written only by the acknowledgement action, as a side effect
--     (signed → enrolled in the area). No page ever listed an enrolment, and no
--     report counted one, so the table was a write-only ledger of an idea the
--     product dropped. The `enrollment.self` / `enrollment.assign` permissions
--     go with it.
--   * materials.requires_acknowledgement: the flag the dashboard sorted on.
--
-- What remains is the record the service actually keeps: material_views, which
-- says which material was opened, when, and how often. That is activity, not a
-- signature, and the staff dashboard's own copy now says so.
--
-- Destructive, and deliberately so: the signature rows are the feature. Any
-- database that still holds them has no reader left for them after this release.
DROP TABLE IF EXISTS "material_progress";
DROP TABLE IF EXISTS "enrollments";
DROP TYPE IF EXISTS "enrollment_source";
ALTER TABLE "materials" DROP COLUMN IF EXISTS "requires_acknowledgement";

INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
  SELECT '713bd2656e79c792d8fce66723a89e4d38bec99d5720ef824d880687b67c5cf1', 1796600000000
  WHERE NOT EXISTS (SELECT 1 FROM drizzle.__drizzle_migrations WHERE created_at = 1796600000000);

-- ─── 0022_grade_not_cadre ────────────────────────────────────────
--
-- "Grade", not "cadre": one name for one thing.
--
-- The GHS establishment sheet calls the column "Category", the old portal called
-- it a cadre, and the people it describes call it their grade. "Grade" is what
-- every form, table and import asks for now, so the two columns that held the
-- word are renamed rather than left to be translated in three places. The values
-- do not change, and nothing reads the old names.
--
ALTER TABLE "users" RENAME COLUMN "cadre" TO "grade";
--> statement-breakpoint
ALTER TABLE "programme_areas" RENAME COLUMN "audience_cadre" TO "audience_grade";

INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
  SELECT '66ab4b612a310d0ddcc516c03b73519516036850630238bff3e541e2a6b2dbb0', 1796700000000
  WHERE NOT EXISTS (SELECT 1 FROM drizzle.__drizzle_migrations WHERE created_at = 1796700000000);

COMMIT;
