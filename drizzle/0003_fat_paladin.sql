CREATE TYPE "public"."district_kind" AS ENUM('METROPOLITAN', 'MUNICIPAL', 'DISTRICT');--> statement-breakpoint
CREATE TYPE "public"."facility_ownership" AS ENUM('GHS', 'CHAG', 'PRIVATE', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."facility_type" AS ENUM('REGIONAL_HOSPITAL', 'MUNICIPAL_HOSPITAL', 'DISTRICT_HOSPITAL', 'POLYCLINIC', 'HEALTH_CENTRE', 'CLINIC', 'DIRECTORATE', 'OTHER');--> statement-breakpoint
CREATE TABLE "districts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"region_id" uuid NOT NULL,
	"name" text NOT NULL,
	"kind" "district_kind" DEFAULT 'DISTRICT' NOT NULL,
	"capital" text
);
--> statement-breakpoint
CREATE TABLE "facilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"district_id" uuid NOT NULL,
	"sub_district_id" uuid,
	"name" text NOT NULL,
	"type" "facility_type" DEFAULT 'HEALTH_CENTRE' NOT NULL,
	"ownership" "facility_ownership" DEFAULT 'GHS' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "material_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"material_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"viewed_on" date NOT NULL,
	"view_count" integer DEFAULT 1 NOT NULL,
	"first_viewed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_viewed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "regions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(8) NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "regions_code_unique" UNIQUE("code"),
	CONSTRAINT "regions_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "sub_districts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"district_id" uuid NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"category_id" uuid NOT NULL,
	"space_id" uuid,
	"organised_on" date NOT NULL,
	"region_id" uuid,
	"district_id" uuid,
	"sub_district_id" uuid,
	"facility_id" uuid,
	"facilitator_name" text,
	"facilitator_id" uuid,
	"attendee_count" integer,
	"notes" text,
	"is_archived" boolean DEFAULT false NOT NULL,
	"created_by_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "districts" ADD CONSTRAINT "districts_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facilities" ADD CONSTRAINT "facilities_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facilities" ADD CONSTRAINT "facilities_sub_district_id_sub_districts_id_fk" FOREIGN KEY ("sub_district_id") REFERENCES "public"."sub_districts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_views" ADD CONSTRAINT "material_views_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_views" ADD CONSTRAINT "material_views_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sub_districts" ADD CONSTRAINT "sub_districts_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_sessions" ADD CONSTRAINT "training_sessions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_sessions" ADD CONSTRAINT "training_sessions_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_sessions" ADD CONSTRAINT "training_sessions_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_sessions" ADD CONSTRAINT "training_sessions_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_sessions" ADD CONSTRAINT "training_sessions_sub_district_id_sub_districts_id_fk" FOREIGN KEY ("sub_district_id") REFERENCES "public"."sub_districts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_sessions" ADD CONSTRAINT "training_sessions_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_sessions" ADD CONSTRAINT "training_sessions_facilitator_id_users_id_fk" FOREIGN KEY ("facilitator_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_sessions" ADD CONSTRAINT "training_sessions_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "districts_region_name_idx" ON "districts" USING btree ("region_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "facilities_district_name_idx" ON "facilities" USING btree ("district_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "material_views_unique_idx" ON "material_views" USING btree ("material_id","user_id","viewed_on");--> statement-breakpoint
CREATE INDEX "material_views_day_idx" ON "material_views" USING btree ("viewed_on");--> statement-breakpoint
CREATE UNIQUE INDEX "sub_districts_district_name_idx" ON "sub_districts" USING btree ("district_id","name");--> statement-breakpoint
CREATE INDEX "training_sessions_organised_idx" ON "training_sessions" USING btree ("organised_on");--> statement-breakpoint
CREATE INDEX "training_sessions_category_idx" ON "training_sessions" USING btree ("category_id","organised_on");