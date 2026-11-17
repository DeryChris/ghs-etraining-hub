-- 0001 — integrity and index migration.
--
-- Operator note (existing environments): the two UNIQUE constraints below fail if
-- history already contains duplicates. Check first, and de-duplicate deliberately:
--
--   select space_id, title, count(*) from materials group by 1,2 having count(*) > 1;
--   select material_id, version, count(*) from material_versions group by 1,2 having count(*) > 1;
--
-- The audit_logs foreign key changes from ON DELETE SET NULL to ON DELETE RESTRICT:
-- deleting a staff member would otherwise null the actor id that the tamper-evident
-- hash chain is computed over, turning every one of their events into a false
-- "chain broken" report. Off-board staff with users.is_active = false instead (ADR-0006).
-- Rows that are already null stay valid; the chain is only re-verified from now on.

ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_user_created_idx" ON "audit_logs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "certificates_user_idx" ON "certificates" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "certificates_material_idx" ON "certificates" USING btree ("material_id");--> statement-breakpoint
CREATE INDEX "comments_material_created_idx" ON "comments" USING btree ("material_id","created_at");--> statement-breakpoint
CREATE INDEX "direct_messages_sender_idx" ON "direct_messages" USING btree ("sender_id","created_at");--> statement-breakpoint
CREATE INDEX "direct_messages_recipient_idx" ON "direct_messages" USING btree ("recipient_id","is_read","created_at");--> statement-breakpoint
CREATE INDEX "enrollments_space_idx" ON "enrollments" USING btree ("space_id");--> statement-breakpoint
CREATE INDEX "material_progress_user_status_idx" ON "material_progress" USING btree ("user_id","status","updated_at");--> statement-breakpoint
CREATE INDEX "materials_visibility_idx" ON "materials" USING btree ("state","is_published","space_id");--> statement-breakpoint
CREATE INDEX "notification_recipients_user_unread_idx" ON "notification_recipients" USING btree ("user_id","is_read");--> statement-breakpoint
CREATE INDEX "notifications_published_at_idx" ON "notifications" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "notifications_expires_at_idx" ON "notifications" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "rate_limit_windows_reset_idx" ON "rate_limit_windows" USING btree ("reset_at");--> statement-breakpoint
CREATE INDEX "users_email_lower_idx" ON "users" USING btree (lower("email"));--> statement-breakpoint
ALTER TABLE "material_versions" ADD CONSTRAINT "material_versions_material_version_key" UNIQUE("material_id","version");--> statement-breakpoint
ALTER TABLE "materials" ADD CONSTRAINT "materials_space_title_key" UNIQUE("space_id","title");