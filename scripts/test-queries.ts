import "dotenv/config";
import { Pool } from "pg";

const rawUrl = process.env.DATABASE_URL!;
let urlWithoutSslMode = rawUrl.replace(/[?&]sslmode=[^&]*/, "");
urlWithoutSslMode = urlWithoutSslMode.replace(/[?&]$/, "");

const pool = new Pool({
  connectionString: urlWithoutSslMode,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const client = await pool.connect();
  try {
    console.log("Connected to database.");

    const userId = "5e551555-a88c-40fb-89c5-cde6c09094a9";

    // Test query 1: CPD credits query
    console.log("\n1. Testing CPD credits query...");
    try {
      const result = await client.query(`
        select coalesce(sum(case when "material_progress"."status" = 'COMPLETED' then "materials"."cpd_credits_x10" else 0 end), 0)::int,
               (count(*) filter (where "material_progress"."status" = 'COMPLETED'))::int,
               (count(*) filter (where "material_progress"."status" = 'IN_PROGRESS'))::int
        from "material_progress" 
        inner join "materials" on "materials"."id" = "material_progress"."material_id" 
        where "material_progress"."user_id" = $1
      `, [userId]);
      console.log("  ✅ CPD credits query OK:", JSON.stringify(result.rows[0]));
    } catch (e: any) {
      console.log("  ❌ CPD credits query FAILED:", e.message);
    }

    // Test query 2: Materials with programme areas query
    console.log("\n2. Testing materials query...");
    try {
      const result = await client.query(`
        select "materials"."id", "materials"."title", "materials"."priority", "materials"."estimated_minutes", "materials"."current_version_id",
               "programme_areas"."name", "programme_areas"."code",
               "material_progress"."acknowledged_at", "material_progress"."material_version_id"
        from "materials" 
        inner join "programme_areas" on "programme_areas"."id" = "materials"."programme_area_id"
        inner join "programme_fields" on "programme_fields"."id" = "programme_areas"."field_id"
        left join "material_progress" on ("material_progress"."material_id" = "materials"."id" and "material_progress"."user_id" = $1)
        where (("materials"."is_published" = $2 and "materials"."state" = $3) 
          and "programme_areas"."is_archived" = $4 and "programme_fields"."is_archived" = $5 
          and "materials"."requires_acknowledgement" = $6)
      `, [userId, true, "PUBLISHED", false, false, true]);
      console.log("  ✅ Materials query OK:", result.rows.length, "rows");
    } catch (e: any) {
      console.log("  ❌ Materials query FAILED:", e.message);
    }

    // Check materials.programme_area_id column nullability
    console.log("\n3. Checking materials.programme_area_id column...");
    const colInfo = await client.query(`
      SELECT column_name, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'materials' AND column_name = 'programme_area_id'
    `);
    console.log("  Column info:", JSON.stringify(colInfo.rows[0]));

    // Check existing data
    console.log("\n4. Checking existing data...");
    const materialCount = await client.query("SELECT count(*) FROM materials");
    console.log("  materials count:", materialCount.rows[0].count);
    
    const paCount = await client.query("SELECT count(*) FROM programme_areas");
    console.log("  programme_areas count:", paCount.rows[0].count);
    
    const pfCount = await client.query("SELECT count(*) FROM programme_fields");
    console.log("  programme_fields count:", pfCount.rows[0].count);

    const nullPA = await client.query("SELECT count(*) FROM materials WHERE programme_area_id IS NULL");
    console.log("  materials with NULL programme_area_id:", nullPA.rows[0].count);

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
