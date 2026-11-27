-- 0011_training_review_and_resources.sql
-- Trainings become reviewed records, carry their own resources, and a
-- facilitator can be granted a whole programme field rather than one area.

-- ── Review state ────────────────────────────────────────────────────────────
-- A new enum rather than more values on training_status: "PLANNED" answers
-- "did this run?", the review state answers "may the rest of GHS see it yet?".
-- Keeping them apart means a cancelled training still records who approved it.
CREATE TYPE "training_review_state" AS ENUM ('PENDING', 'PUBLISHED', 'REJECTED');

ALTER TABLE "training_sessions"
  ADD COLUMN IF NOT EXISTS "review_state" "training_review_state" NOT NULL DEFAULT 'PUBLISHED',
  ADD COLUMN IF NOT EXISTS "reviewed_by_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "reviewed_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "review_note" text;

-- Everything already in the register predates review, and refusing to show it
-- would erase the record. New facilitator rows start PENDING (in the action).
CREATE INDEX IF NOT EXISTS "training_sessions_review_idx"
  ON "training_sessions" ("review_state", "created_at");

-- ── Resources filed with a training ─────────────────────────────────────────
-- Deliberately not `materials`: a material is a versioned, reviewed teaching
-- object filed under an area. A resource is the slide deck or attendance sheet
-- for one event, it has no versions, and it dies with the training.
CREATE TABLE IF NOT EXISTS "training_resources" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "training_id" uuid NOT NULL REFERENCES "training_sessions"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "storage_key" text NOT NULL UNIQUE,
  "mime_type" text,
  "size_bytes" integer,
  "uploaded_by_id" uuid NOT NULL REFERENCES "users"("id"),
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "training_resources_training_idx"
  ON "training_resources" ("training_id", "created_at");

-- ── Field-level facilitator grants ──────────────────────────────────────────
-- area_facilitators says "this person may teach this area". A field grant says
-- "this person may work anywhere in this field", including areas created later,
-- which is how unit heads are actually appointed.
CREATE TABLE IF NOT EXISTS "field_facilitators" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "field_id" uuid NOT NULL REFERENCES "programme_fields"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "assigned_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "field_facilitators_unique_idx"
  ON "field_facilitators" ("field_id", "user_id");
CREATE INDEX IF NOT EXISTS "field_facilitators_user_idx"
  ON "field_facilitators" ("user_id");
