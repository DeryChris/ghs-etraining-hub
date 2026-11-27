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
