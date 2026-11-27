-- 0016_drop_award_columns.sql
-- `materials` still carried two columns from the awarding model: the CPD credit
-- value and the recertification cycle. Nothing reads either of them now that the
-- library is informational (ADR-0011), and a column nobody reads is an invitation
-- to re-introduce the framing the client retired.
ALTER TABLE "materials" DROP COLUMN IF EXISTS "cpd_credits_x10";
ALTER TABLE "materials" DROP COLUMN IF EXISTS "recertification_months";
