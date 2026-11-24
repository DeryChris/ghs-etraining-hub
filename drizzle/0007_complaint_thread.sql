-- 0007 · complaints become a conversation
--
-- An answer was a single field: it could be replaced, but not replied to, so a
-- person who still could not sign in had to lodge a second complaint. A thread
-- keeps the back-and-forth in one place, with who said what and when.

CREATE TABLE IF NOT EXISTS "complaint_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"complaint_id" uuid NOT NULL,
	"author_id" uuid,
	"author_role" varchar(16) NOT NULL,
	"author_name" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "complaint_messages" ADD CONSTRAINT "complaint_messages_complaint_id_complaints_id_fk" FOREIGN KEY ("complaint_id") REFERENCES "public"."complaints"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "complaint_messages" ADD CONSTRAINT "complaint_messages_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "complaint_messages_thread_idx" ON "complaint_messages" USING btree ("complaint_id","created_at");
--> statement-breakpoint

-- Indexes for the tabs people said were slow. Each one covers a predicate the
-- pages actually filter on, so geography, notifications and the review queue
-- stop scanning.
CREATE INDEX IF NOT EXISTS "users_is_unit_head_idx" ON "users" USING btree ("is_unit_head") WHERE "is_unit_head";
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "materials_area_state_idx" ON "materials" USING btree ("programme_area_id","state");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "material_views_user_day_idx" ON "material_views" USING btree ("user_id","viewed_on" DESC);
