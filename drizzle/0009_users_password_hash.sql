-- 0009_users_password_hash.sql
-- Add passwordHash column to users for custom auth (replacing Supabase Auth).
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_hash" text;
