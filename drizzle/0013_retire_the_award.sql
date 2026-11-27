-- 0013_retire_the_award.sql
-- The library puts training material in front of staff; it is not an awarding
-- body. Certificates were already no longer issued, and the verification page
-- they fed has gone with them. Keeping the table would keep the question alive,
-- so it goes. Activity records (material_progress, material_views, audit_logs)
-- are untouched: statistics are the reason this system records anything at all.
DROP TABLE IF EXISTS "certificates";
