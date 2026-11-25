-- 0008_users_email_index.sql
-- Add indexes so session lookups and shell badge counts don't require
-- full table scans on Supabase's free tier, which is slow on cold starts.

-- Session lookup: resolveAccount() queries users by lower(email) on every page load.
CREATE INDEX IF NOT EXISTS "users_email_lower_idx" ON "users" (lower("email"));

-- Badge counts on the dashboard shell run on every navigation:
--   countUnreadMessages: direct_messages WHERE recipient_id = ? AND is_read = false
CREATE INDEX IF NOT EXISTS "direct_messages_recipient_unread_idx" ON "direct_messages" ("recipient_id", "is_read");

--   countUnreadNotifications: notification_read_cursors lookups
-- (unique constraint on (user_id, notification_id) already covers this)

--   countReviewQueue: material_versions.state = 'IN_REVIEW'
CREATE INDEX IF NOT EXISTS "material_versions_state_idx" ON "material_versions" ("state");
