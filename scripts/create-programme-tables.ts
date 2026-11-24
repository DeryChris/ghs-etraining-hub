import "dotenv/config";
import { Pool } from "pg";

const rawUrl = process.env.DATABASE_URL!;
let urlWithoutSslMode = rawUrl.replace(/[?&]sslmode=[^&]*/, "");
urlWithoutSslMode = urlWithoutSslMode.replace(/[?&]$/, "");

const pool = new Pool({
  connectionString: urlWithoutSslMode,
  ssl: { rejectUnauthorized: false },
});

async function query(client: any, sql: string) {
  await client.query(sql);
}

async function main() {
  const client = await pool.connect();
  try {
    console.log("Connected to database.");

    // 1. Create enums if they don't exist
    console.log("\n1. Creating enums...");
    await query(client, `
      DO $$ BEGIN
        CREATE TYPE "material_state" AS ENUM ('DRAFT', 'IN_REVIEW', 'PUBLISHED', 'SUPERSEDED', 'ARCHIVED');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    await query(client, `
      DO $$ BEGIN
        CREATE TYPE "material_type" AS ENUM ('DOCUMENT', 'VIDEO', 'LAB', 'ASSESSMENT_LINK');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    await query(client, `
      DO $$ BEGIN
        CREATE TYPE "material_priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    await query(client, `
      DO $$ BEGIN
        CREATE TYPE "enrollment_source" AS ENUM ('SELF', 'ASSIGNED');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    await query(client, `
      DO $$ BEGIN
        CREATE TYPE "scan_status" AS ENUM ('PENDING', 'CLEAN', 'INFECTED');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    await query(client, `
      DO $$ BEGIN
        CREATE TYPE "progress_status" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    console.log("  ✅ Enums created");

    // 2. Create programme_fields table
    console.log("\n2. Creating programme_fields table...");
    await query(client, `
      CREATE TABLE IF NOT EXISTS "programme_fields" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "code" varchar(24) NOT NULL UNIQUE,
        "name" text NOT NULL UNIQUE,
        "description" text,
        "is_restricted" boolean NOT NULL DEFAULT false,
        "sort_order" integer NOT NULL DEFAULT 0,
        "is_archived" boolean NOT NULL DEFAULT false,
        "created_at" timestamp with time zone NOT NULL DEFAULT now(),
        "updated_at" timestamp with time zone NOT NULL DEFAULT now()
      );
    `);
    console.log("  ✅ programme_fields");

    // 3. Create programme_areas table
    console.log("\n3. Creating programme_areas table...");
    await query(client, `
      CREATE TABLE IF NOT EXISTS "programme_areas" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "field_id" uuid NOT NULL REFERENCES "public"."programme_fields"("id") ON DELETE cascade,
        "code" varchar(24) NOT NULL UNIQUE,
        "name" text NOT NULL,
        "description" text,
        "audience_region" text,
        "audience_directorate" text,
        "audience_cadre" text,
        "sort_order" integer NOT NULL DEFAULT 0,
        "is_archived" boolean NOT NULL DEFAULT false,
        "created_at" timestamp with time zone NOT NULL DEFAULT now(),
        "updated_at" timestamp with time zone NOT NULL DEFAULT now()
      );
    `);
    await query(client, `
      CREATE UNIQUE INDEX IF NOT EXISTS "programme_areas_field_name_idx" 
      ON "programme_areas" USING btree ("field_id", "name");
    `);
    await query(client, `
      CREATE INDEX IF NOT EXISTS "programme_areas_field_idx" 
      ON "programme_areas" USING btree ("field_id");
    `);
    console.log("  ✅ programme_areas");

    // 4. Create area_facilitators table
    console.log("\n4. Creating area_facilitators table...");
    await query(client, `
      CREATE TABLE IF NOT EXISTS "area_facilitators" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "area_id" uuid NOT NULL REFERENCES "public"."programme_areas"("id") ON DELETE cascade,
        "user_id" uuid NOT NULL REFERENCES "public"."users"("id") ON DELETE cascade,
        "created_at" timestamp with time zone NOT NULL DEFAULT now()
      );
    `);
    console.log("  ✅ area_facilitators");

    // 5. Add programme_area_id and programme_field_id columns to materials
    console.log("\n5. Adding columns to materials table...");
    
    // Check if programme_area_id exists on materials
    const { rows: materialCols } = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'materials' AND table_schema = 'public'
    `);
    const materialColNames = materialCols.map((r: any) => r.column_name);
    
    if (!materialColNames.includes("programme_area_id")) {
      await query(client, `
        ALTER TABLE "materials" ADD COLUMN "programme_area_id" uuid;
      `);
      console.log("  ✅ Added materials.programme_area_id");
    } else {
      console.log("  - materials.programme_area_id already exists");
    }
    
    if (!materialColNames.includes("programme_field_id")) {
      await query(client, `
        ALTER TABLE "materials" ADD COLUMN "programme_field_id" uuid REFERENCES "public"."programme_fields"("id") ON DELETE set null;
      `);
      console.log("  ✅ Added materials.programme_field_id");
    } else {
      console.log("  - materials.programme_field_id already exists");
    }
    
    // Add FK for programme_area_id if not exists
    await query(client, `
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'materials_programme_area_id_programme_areas_id_fk'
        ) THEN
          ALTER TABLE "materials" 
          ADD CONSTRAINT "materials_programme_area_id_programme_areas_id_fk" 
          FOREIGN KEY ("programme_area_id") REFERENCES "public"."programme_areas"("id") ON DELETE cascade;
        END IF;
      END $$;
    `);
    console.log("  ✅ Added materials.programme_area_id FK");

    // Add indexes on materials
    await query(client, `
      CREATE INDEX IF NOT EXISTS "materials_programme_area_idx" 
      ON "materials" USING btree ("programme_area_id");
    `);
    await query(client, `
      CREATE UNIQUE INDEX IF NOT EXISTS "materials_area_title_key" 
      ON "materials" USING btree ("programme_area_id", "title");
    `);
    console.log("  ✅ Added materials indexes");

    // 6. Add programme_area_id to enrollments
    console.log("\n6. Adding columns to enrollments table...");
    const { rows: enrollCols } = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'enrollments' AND table_schema = 'public'
    `);
    const enrollColNames = enrollCols.map((r: any) => r.column_name);
    
    if (!enrollColNames.includes("programme_area_id")) {
      await query(client, `
        ALTER TABLE "enrollments" ADD COLUMN "programme_area_id" uuid;
      `);
      console.log("  ✅ Added enrollments.programme_area_id");
    } else {
      console.log("  - enrollments.programme_area_id already exists");
    }
    
    await query(client, `
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'enrollments_programme_area_id_programme_areas_id_fk'
        ) THEN
          ALTER TABLE "enrollments" 
          ADD CONSTRAINT "enrollments_programme_area_id_programme_areas_id_fk" 
          FOREIGN KEY ("programme_area_id") REFERENCES "public"."programme_areas"("id") ON DELETE cascade;
        END IF;
      END $$;
    `);
    console.log("  ✅ Added enrollments.programme_area_id FK");
    
    await query(client, `
      CREATE UNIQUE INDEX IF NOT EXISTS "enrollments_user_id_programme_area_id_unique" 
      ON "enrollments" USING btree ("user_id", "programme_area_id");
    `);
    await query(client, `
      CREATE INDEX IF NOT EXISTS "enrollments_area_idx" 
      ON "enrollments" USING btree ("programme_area_id");
    `);
    console.log("  ✅ Added enrollments indexes");

    console.log("\n✅ All missing tables and columns created!");
    console.log("\nNote: materials.programme_area_id is currently nullable. Existing materials");
    console.log("need to be backfilled with a valid programme_area_id before making it NOT NULL.");
    console.log("You may need to create some programme_fields and programme_areas first.");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
