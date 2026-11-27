-- 0010_password_reset_tokens.sql
-- One-time password resets without a third-party auth service.
--
-- The token itself is never stored: the row keeps a SHA-256 hash and a one-hour
-- expiry, so a database read cannot be replayed into a password change. The
-- index makes the lookup by hash a single-row read even with a large directory.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_reset_token" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_reset_expires_at" timestamp with time zone;

CREATE INDEX IF NOT EXISTS "users_password_reset_token_idx" ON "users" ("password_reset_token");
