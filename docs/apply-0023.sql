-- Applying migration 0023 by hand, from the Neon SQL editor.
--
-- For when `npm run db:migrate` is not available (no terminal, or a machine that
-- cannot reach the database). Run this ONCE on the database that `/api/health`
-- reports as `SCHEMA_BEHIND`, then reload `/api/health` — it should say 24 of 24.
--
-- This is the companion to `docs/apply-pending-migrations.sql`, which carries
-- 0019–0022. Run that one first if it has not been run; this one only adds 0023.
--
-- It does what drizzle does, in the same order, and records the same ledger row
-- (`drizzle.__drizzle_migrations`: sha256 of the file, plus the journal stamp), so
-- a later `npm run db:migrate` finds nothing to do instead of trying to re-apply
-- 0023 on a database that has already had it.
--
-- Everything is in one transaction: if any statement fails, nothing changes.
-- Unlike 0019–0022 this is safe to run twice — the UPDATE simply matches nothing
-- the second time — so the guard below only reports, it does not mutate.

BEGIN;

-- Say where we already are, rather than failing with a confusing error later.
DO $$
DECLARE newest bigint;
BEGIN
  SELECT max(created_at) INTO newest FROM drizzle.__drizzle_migrations;
  IF newest IS NOT NULL AND newest >= 1796800000000 THEN
    RAISE NOTICE 'Migration 0023 is already recorded (newest stamp %). Nothing to do.', newest;
  ELSE
    RAISE NOTICE 'Applying 0023 on a database whose newest recorded stamp is %.', COALESCE(newest::text, 'none');
  END IF;
END $$;

-- ─── 0023_redact_legacy_complaint_passwords ──────────────────────
--
-- Older complaint-driven access resets put the generated plaintext password in
-- complaints.response. That column is returned by the public Staff-ID status
-- lookup, so the password was readable by anyone holding a Staff ID.
--
-- The code no longer writes it (and the public read redacts it either way), but
-- the historical rows still hold it, and a redaction at the read boundary does
-- not help a database dump. This rewrites the stored values in place.
--
-- Irreversible: the plaintext is replaced by a marker, not moved. That is the
-- point — those passwords were one-time resets and every one of them has either
-- been used or expired.
UPDATE "complaints"
SET "response" = regexp_replace(
  "response",
  'temporary[[:space:]]+password[[:space:]]*:[[:space:]]*[^[:space:].,;]+',
  'Temporary password: [provided separately]',
  'gi'
)
WHERE "response" ~* 'temporary[[:space:]]+password[[:space:]]*:';

INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
  SELECT 'c35dc356463982e3eabfb01a54df01ca7a61ecc0000a7fa2399624646bbe0247', 1796800000000
  WHERE NOT EXISTS (SELECT 1 FROM drizzle.__drizzle_migrations WHERE created_at = 1796800000000);

COMMIT;
