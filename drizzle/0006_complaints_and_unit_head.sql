-- 0006 · complaints, and the unit-head flag
--
-- Two things the pilot needed once real staff started using it:
--
--   1. A place to put a problem. Until now a forgotten password or a wrong name
--      was fixed by a phone call, and nothing recorded what was asked or what was
--      done. `complaints` is that record: the person, the issue, the answer and
--      who gave it. It is readable by administrators, and by the person who
--      lodged it, who looks it up with their staff ID.
--
--   2. Somebody accountable for quality per programme field. A unit head is a
--      facilitator carrying one extra duty — deciding the review queue for the
--      material filed under their fields — so this is a flag on the account, not
--      a fourth role. Every existing facilitator keeps working exactly as before,
--      and a facilitator who is promoted keeps their area assignments, trainings
--      and materials.

DO $$ BEGIN
  CREATE TYPE "public"."complaint_issue" AS ENUM('PERSONAL_DETAILS', 'COURSE_RELATED', 'LOGIN_ACCESS', 'OTHERS');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."complaint_status" AS ENUM('SUBMITTED', 'IN_PROGRESS', 'RESOLVED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_unit_head" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "complaints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" varchar(16) NOT NULL,
	"staff_id" varchar(16),
	"user_id" uuid,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"region" text,
	"facility" text,
	"issue_type" "complaint_issue" NOT NULL,
	"subject" text NOT NULL,
	"description" text NOT NULL,
	"status" "complaint_status" DEFAULT 'SUBMITTED' NOT NULL,
	"response" text,
	"responded_by_id" uuid,
	"responded_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "complaints_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "complaints" ADD CONSTRAINT "complaints_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "complaints" ADD CONSTRAINT "complaints_responded_by_id_users_id_fk" FOREIGN KEY ("responded_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "complaints_staff_idx" ON "complaints" USING btree (lower("staff_id"));
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "complaints_status_idx" ON "complaints" USING btree ("status","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "complaints_user_idx" ON "complaints" USING btree ("user_id");
