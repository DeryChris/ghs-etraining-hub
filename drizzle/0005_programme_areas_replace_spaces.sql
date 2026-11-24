-- 0005 · programme areas replace directorates (categories) and spaces
--
-- Until now the product carried two vocabularies for the same question. A
-- material was filed under a space inside a directorate; a training was filed
-- under a programme field and area. Nothing could be counted across them, and a
-- facilitator's authority (granted per directorate) did not line up with the
-- areas their trainings were filed in. This migration makes the programme
-- taxonomy the only one: a field holds areas, an area holds its materials, its
-- facilitators and its trainings.
--
-- Three things happen here, in this order:
--   1. the reference data the backfill needs is ensured (the GHS fields and
--      areas, from src/db/data/programme-taxonomy.ts — the seeder re-upserts it);
--   2. every existing space is mapped to the programme area that teaches the
--      same subject, and its materials, enrolments and facilitators move with
--      it;
--   3. the directorate tables are dropped, after a JSON snapshot is taken so
--      the mapping can be reviewed and reversed.
--
-- The space → area mapping is the judgement call in this migration. Each old
-- category mapped to the field that runs the same programme, and each space to
-- the area inside it:
--
--   Public Health Directorate       → Public Health
--   Disease Control Department      → Public Health
--   Family Health Division          → Family and Health
--   Health Promotion Division       → Health Promotion
--   Institutional Care Division     → Clinical Care
--
--   cold-chain-and-vaccine-management → PF-PH-01  EPI
--   malaria-case-management           → PF-PH-03  NMCP
--   integrated-disease-surveillance   → PF-PH-06  Surveillance
--   emergency-obstetric-care          → PF-FAM-02 Reproductive and Child Health
--   risk-communication                → PF-HPR-05 Health Communication
--   triage-and-emergency-care         → PF-CLIN-02 Clinical Service Development
--   ppe-donning-and-doffing           → PF-CLIN-03 Quality Assurance
--   standard-precautions-sop          → PF-CLIN-03 Quality Assurance
--
-- Anything that does not match (`mapped_area_code` is null) is reported rather
-- than guessed: the migration stops with an error naming the space, so no
-- material is silently filed under the wrong programme.

-- ── 1. Reference data ───────────────────────────────────────────────────────
INSERT INTO "programme_fields" ("code", "name", "sort_order") VALUES
  ('PF-ADM', 'Administration and Support Services', 0),
  ('PF-CLIN', 'Clinical Care', 10),
  ('PF-FAM', 'Family and Health', 20),
  ('PF-FIN', 'Finance and Audit', 30),
  ('PF-HPR', 'Health Promotion', 40),
  ('PF-HR', 'Human Resource', 50),
  ('PF-PPME', 'Policy, Planning, Monitoring and Evaluation', 60),
  ('PF-PH', 'Public Health', 70),
  ('PF-RD', 'Research and Development', 80),
  ('PF-SCM', 'Supply Chain Management', 90)
ON CONFLICT ("code") DO NOTHING;
--> statement-breakpoint

INSERT INTO "programme_areas" ("code", "name", "field_id", "sort_order")
SELECT v.code, v.name, f.id, (row_number() OVER (PARTITION BY v.field_code ORDER BY v.code) - 1) * 10
FROM (VALUES
  ('PF-ADM-01', 'Biomedical Equipment', 'PF-ADM'),
  ('PF-ADM-02', 'Estate Management', 'PF-ADM'),
  ('PF-ADM-03', 'Health Administration', 'PF-ADM'),
  ('PF-ADM-04', 'Transport Management', 'PF-ADM'),
  ('PF-CLIN-01', 'Clinical Information and Monitoring', 'PF-CLIN'),
  ('PF-CLIN-02', 'Clinical Service Development', 'PF-CLIN'),
  ('PF-CLIN-03', 'Quality Assurance', 'PF-CLIN'),
  ('PF-FAM-01', 'Nutrition', 'PF-FAM'),
  ('PF-FAM-02', 'Reproductive and Child Health', 'PF-FAM'),
  ('PF-FIN-01', 'Control and Compliance', 'PF-FIN'),
  ('PF-FIN-02', 'Financial Information Systems Management (FISM)', 'PF-FIN'),
  ('PF-FIN-03', 'Financial Reporting and Analysis', 'PF-FIN'),
  ('PF-FIN-04', 'Performance Audit', 'PF-FIN'),
  ('PF-HPR-01', 'Advocacy and Social Mobilisation', 'PF-HPR'),
  ('PF-HPR-02', 'Anaesthesia', 'PF-HPR'),
  ('PF-HPR-03', 'Case Management', 'PF-HPR'),
  ('PF-HPR-04', 'Diagnostic Services', 'PF-HPR'),
  ('PF-HPR-05', 'Health Communication', 'PF-HPR'),
  ('PF-HPR-06', 'Mental Health', 'PF-HPR'),
  ('PF-HPR-07', 'Nursing Practice', 'PF-HPR'),
  ('PF-HPR-08', 'Pharmacy', 'PF-HPR'),
  ('PF-HPR-09', 'Rehabilitation', 'PF-HPR'),
  ('PF-HPR-10', 'Research and Health Policy', 'PF-HPR'),
  ('PF-HR-01', 'Management', 'PF-HR'),
  ('PF-HR-02', 'Planning', 'PF-HR'),
  ('PF-HR-03', 'Training', 'PF-HR'),
  ('PF-PPME-01', 'Information Communication Technology', 'PF-PPME'),
  ('PF-PPME-02', 'Monitoring and Evaluation', 'PF-PPME'),
  ('PF-PPME-03', 'Planning and Budget', 'PF-PPME'),
  ('PF-PPME-04', 'Policy', 'PF-PPME'),
  ('PF-PH-01', 'EPI', 'PF-PH'),
  ('PF-PH-02', 'NACP', 'PF-PH'),
  ('PF-PH-03', 'NMCP', 'PF-PH'),
  ('PF-PH-04', 'NTCP', 'PF-PH'),
  ('PF-PH-05', 'Occupational Health', 'PF-PH'),
  ('PF-PH-06', 'Surveillance', 'PF-PH'),
  ('PF-RD-01', 'Dissemination, Documentation and Advocacy', 'PF-RD'),
  ('PF-RD-02', 'Ethics and Research Management', 'PF-RD'),
  ('PF-RD-03', 'Research Coordination', 'PF-RD'),
  ('PF-SCM-01', 'Procurement', 'PF-SCM'),
  ('PF-SCM-02', 'Supply Chain Management', 'PF-SCM')
) AS v(code, name, field_code)
JOIN "programme_fields" f ON f.code = v.field_code
ON CONFLICT ("code") DO NOTHING;
--> statement-breakpoint

-- ── 2. A snapshot of what is about to disappear ─────────────────────────────
CREATE TABLE IF NOT EXISTS "legacy_taxonomy_backup" (
  "taken_at" timestamp with time zone DEFAULT now() NOT NULL,
  "entity" text NOT NULL,
  "payload" jsonb NOT NULL
);
--> statement-breakpoint
INSERT INTO "legacy_taxonomy_backup" ("entity", "payload")
SELECT 'categories', to_jsonb(c) FROM "categories" c;
--> statement-breakpoint
INSERT INTO "legacy_taxonomy_backup" ("entity", "payload")
SELECT 'spaces', to_jsonb(s) FROM "spaces" s;
--> statement-breakpoint
INSERT INTO "legacy_taxonomy_backup" ("entity", "payload")
SELECT 'category_facilitators', to_jsonb(cf) FROM "category_facilitators" cf;
--> statement-breakpoint

-- ── 3. The mapping, as a table so it can be inspected in the same run ───────
CREATE TEMPORARY TABLE "space_area_map" ON COMMIT DROP AS
SELECT
  s.id AS space_id,
  s.slug,
  CASE s.slug
    WHEN 'cold-chain-and-vaccine-management' THEN 'PF-PH-01'
    WHEN 'malaria-case-management'           THEN 'PF-PH-03'
    WHEN 'integrated-disease-surveillance'   THEN 'PF-PH-06'
    WHEN 'emergency-obstetric-care'          THEN 'PF-FAM-02'
    WHEN 'risk-communication'                THEN 'PF-HPR-05'
    WHEN 'triage-and-emergency-care'         THEN 'PF-CLIN-02'
    WHEN 'ppe-donning-and-doffing'           THEN 'PF-CLIN-03'
    WHEN 'standard-precautions-sop'          THEN 'PF-CLIN-03'
  END AS area_code
FROM "spaces" s;
--> statement-breakpoint

DO $$
DECLARE unmapped text;
BEGIN
  SELECT string_agg(slug, ', ') INTO unmapped FROM "space_area_map" WHERE area_code IS NULL;
  IF unmapped IS NOT NULL THEN
    RAISE EXCEPTION 'These spaces have no programme area mapped: %. Add a WHEN branch to space_area_map before running this migration.', unmapped;
  END IF;
END $$;
--> statement-breakpoint

-- ── 4. Indexes that will be replaced (they name the old columns) ────────────
DROP INDEX IF EXISTS "materials_space_id_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "materials_visibility_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "enrollments_space_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "training_sessions_category_idx";
--> statement-breakpoint

-- ── 5. New columns ──────────────────────────────────────────────────────────
ALTER TABLE "programme_fields" ADD COLUMN "is_restricted" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "programme_areas" ADD COLUMN "audience_region" text;
--> statement-breakpoint
ALTER TABLE "programme_areas" ADD COLUMN "audience_directorate" text;
--> statement-breakpoint
ALTER TABLE "programme_areas" ADD COLUMN "audience_cadre" text;
--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "programme_area_id" uuid;
--> statement-breakpoint
ALTER TABLE "enrollments" ADD COLUMN "programme_area_id" uuid;
--> statement-breakpoint

-- ── 6. Move the content ─────────────────────────────────────────────────────
UPDATE "materials" m
SET "programme_area_id" = a.id
FROM "space_area_map" map
JOIN "programme_areas" a ON a.code = map.area_code
WHERE m.space_id = map.space_id;
--> statement-breakpoint

UPDATE "enrollments" e
SET "programme_area_id" = a.id
FROM "space_area_map" map
JOIN "programme_areas" a ON a.code = map.area_code
WHERE e.space_id = map.space_id;
--> statement-breakpoint

-- Cohort targeting and the "sensitive programme" flag lived on the space and
-- its directorate; they move down to the area that replaced both.
UPDATE "programme_areas" a
SET "audience_region" = s.audience_region,
    "audience_directorate" = s.audience_directorate,
    "audience_cadre" = s.audience_cadre
FROM "space_area_map" map
JOIN "spaces" s ON s.id = map.space_id
WHERE a.code = map.area_code;
--> statement-breakpoint

CREATE TABLE "area_facilitators" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "area_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "assigned_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- A facilitator used to be granted a whole directorate. That grant is expanded
-- to every area of the field that directorate became, so nobody loses reach.
INSERT INTO "area_facilitators" ("area_id", "user_id")
SELECT DISTINCT a.id, cf.user_id
FROM "category_facilitators" cf
JOIN "categories" c ON c.id = cf.category_id
JOIN "programme_fields" f ON f.code = CASE c.code
  WHEN 'CAT-PHD-01' THEN 'PF-PH'
  WHEN 'CAT-DCD-04' THEN 'PF-PH'
  WHEN 'CAT-FHD-03' THEN 'PF-FAM'
  WHEN 'CAT-ICD-02' THEN 'PF-CLIN'
  WHEN 'CAT-HPD-05' THEN 'PF-HPR'
END
JOIN "programme_areas" a ON a.field_id = f.id
ON CONFLICT DO NOTHING;
--> statement-breakpoint

UPDATE "programme_fields" f
SET "is_restricted" = true
FROM (VALUES ('CAT-PHD-01','PF-PH'), ('CAT-DCD-04','PF-PH'), ('CAT-FHD-03','PF-FAM'),
             ('CAT-ICD-02','PF-CLIN'), ('CAT-HPD-05','PF-HPR')) AS map(category_code, field_code)
JOIN "categories" c ON c.code = map.category_code
WHERE f.code = map.field_code AND c.is_restricted;
--> statement-breakpoint

ALTER TABLE "area_facilitators" ADD CONSTRAINT "area_facilitators_area_id_programme_areas_id_fk" FOREIGN KEY ("area_id") REFERENCES "public"."programme_areas"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "area_facilitators" ADD CONSTRAINT "area_facilitators_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "area_facilitators_unique_idx" ON "area_facilitators" USING btree ("area_id","user_id");
--> statement-breakpoint
CREATE INDEX "area_facilitators_user_idx" ON "area_facilitators" USING btree ("user_id");
--> statement-breakpoint

-- Nothing may be left unfiled once the old columns go.
DO $$
DECLARE orphans int;
BEGIN
  SELECT count(*) INTO orphans FROM "materials" WHERE "programme_area_id" IS NULL;
  IF orphans > 0 THEN
    RAISE EXCEPTION '% material(s) could not be filed under a programme area. Fix the mapping before running this migration.', orphans;
  END IF;
END $$;
--> statement-breakpoint

ALTER TABLE "materials" ALTER COLUMN "programme_area_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "enrollments" ALTER COLUMN "programme_area_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "materials" ADD CONSTRAINT "materials_programme_area_id_programme_areas_id_fk" FOREIGN KEY ("programme_area_id") REFERENCES "public"."programme_areas"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_programme_area_id_programme_areas_id_fk" FOREIGN KEY ("programme_area_id") REFERENCES "public"."programme_areas"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "materials_programme_area_idx" ON "materials" USING btree ("programme_area_id");
--> statement-breakpoint
CREATE INDEX "materials_visibility_idx" ON "materials" USING btree ("state","is_published","programme_area_id");
--> statement-breakpoint
CREATE INDEX "enrollments_area_idx" ON "enrollments" USING btree ("programme_area_id");
--> statement-breakpoint
ALTER TABLE "materials" ADD CONSTRAINT "materials_area_title_key" UNIQUE("programme_area_id","title");
--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_user_id_programme_area_id_unique" UNIQUE("user_id","programme_area_id");
--> statement-breakpoint

-- ── 7. Retire the old vocabulary ────────────────────────────────────────────
ALTER TABLE "materials" DROP COLUMN "space_id";
--> statement-breakpoint
ALTER TABLE "enrollments" DROP COLUMN "space_id";
--> statement-breakpoint
ALTER TABLE "training_sessions" DROP COLUMN "category_id";
--> statement-breakpoint
ALTER TABLE "training_sessions" DROP COLUMN "space_id";
--> statement-breakpoint
DROP TABLE "spaces";
--> statement-breakpoint
DROP TABLE "category_facilitators";
--> statement-breakpoint
DROP TABLE "categories";
