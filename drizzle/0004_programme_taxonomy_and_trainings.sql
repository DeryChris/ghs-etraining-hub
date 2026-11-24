CREATE TYPE "public"."training_status" AS ENUM('PLANNED', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "programme_areas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"field_id" uuid NOT NULL,
	"code" varchar(24) NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "programme_areas_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "programme_fields" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(24) NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "programme_fields_code_unique" UNIQUE("code"),
	CONSTRAINT "programme_fields_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "training_sessions" ALTER COLUMN "category_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "training_sessions" ADD COLUMN "year" integer DEFAULT extract(year from current_date)::int NOT NULL;--> statement-breakpoint
ALTER TABLE "training_sessions" ADD COLUMN "programme_field_id" uuid;--> statement-breakpoint
ALTER TABLE "training_sessions" ADD COLUMN "programme_area_id" uuid;--> statement-breakpoint
ALTER TABLE "training_sessions" ADD COLUMN "target_group" text;--> statement-breakpoint
ALTER TABLE "training_sessions" ADD COLUMN "ends_on" date;--> statement-breakpoint
ALTER TABLE "training_sessions" ADD COLUMN "duration_text" text;--> statement-breakpoint
ALTER TABLE "training_sessions" ADD COLUMN "status" "training_status" DEFAULT 'COMPLETED' NOT NULL;--> statement-breakpoint
ALTER TABLE "training_sessions" ADD COLUMN "venue" text;--> statement-breakpoint
ALTER TABLE "programme_areas" ADD CONSTRAINT "programme_areas_field_id_programme_fields_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."programme_fields"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "programme_areas_field_name_idx" ON "programme_areas" USING btree ("field_id","name");--> statement-breakpoint
CREATE INDEX "programme_areas_field_idx" ON "programme_areas" USING btree ("field_id");--> statement-breakpoint
ALTER TABLE "training_sessions" ADD CONSTRAINT "training_sessions_programme_field_id_programme_fields_id_fk" FOREIGN KEY ("programme_field_id") REFERENCES "public"."programme_fields"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_sessions" ADD CONSTRAINT "training_sessions_programme_area_id_programme_areas_id_fk" FOREIGN KEY ("programme_area_id") REFERENCES "public"."programme_areas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "training_sessions_year_idx" ON "training_sessions" USING btree ("year","organised_on");--> statement-breakpoint
CREATE INDEX "training_sessions_area_idx" ON "training_sessions" USING btree ("programme_area_id");--> statement-breakpoint
/* Backfill: the ADD COLUMN default stamps today's year on historical sessions.
   Their year is the year they ran, so correct it before anything reads it. */
UPDATE "training_sessions" SET "year" = extract(year from "organised_on")::int;
