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
