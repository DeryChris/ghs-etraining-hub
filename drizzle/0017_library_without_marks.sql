-- 0017_library_without_marks.sql
-- The library stopped being a course. `material_progress` carried a learning
-- path — not started, in progress, completed, watched percent — and every page
-- computed a fraction of it. "0 of 0 materials completed" was the visible end of
-- that: arithmetic about attendance at something nobody had enrolled in. The
-- columns go, and what is left of the table is the one fact worth keeping: who
-- signed for which version of a protocol, and when.
ALTER TABLE "material_progress" DROP COLUMN IF EXISTS "status";
ALTER TABLE "material_progress" DROP COLUMN IF EXISTS "watched_percent";
ALTER TABLE "material_progress" DROP COLUMN IF EXISTS "completed_at";
DROP INDEX IF EXISTS "material_progress_user_status_idx";
CREATE INDEX IF NOT EXISTS "material_progress_user_idx" ON "material_progress" ("user_id", "updated_at");
DROP TYPE IF EXISTS "progress_status";

-- Files with nowhere to live. The deployment is Neon plus Vercel; Neon is a
-- database and has no file service, so until an S3-compatible bucket is
-- configured the same storage interface keeps bytes here. The ceiling is
-- Vercel's request body limit (~4.5 MB), not Postgres.
CREATE TABLE IF NOT EXISTS "file_blobs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "storage_key" text NOT NULL UNIQUE,
  "mime_type" text,
  "size_bytes" integer NOT NULL,
  "bytes" bytea NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- The training page: one optional picture, and the conversation underneath it.
ALTER TABLE "training_sessions" ADD COLUMN IF NOT EXISTS "image_storage_key" text;

CREATE TABLE IF NOT EXISTS "training_comments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "training_id" uuid NOT NULL REFERENCES "training_sessions" ("id") ON DELETE CASCADE,
  "author_id" uuid NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "body" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "training_comments_training_idx" ON "training_comments" ("training_id", "created_at");
