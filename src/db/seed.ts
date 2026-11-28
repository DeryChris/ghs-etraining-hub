import "@/lib/load-env";
import { eq, sql } from "drizzle-orm";
import { db } from "./client";
import { users, programmeFields, programmeAreas } from "./schema";
import { seedGeography } from "./seed-geography";
import {
  PROGRAMME_FIELDS,
  flatProgrammeAreas,
} from "./data/programme-taxonomy";

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@ghs.gov.gh";
// The seeded admin has no password here. Provision its login with scripts/provision-auth-user.ts.

async function main() {
  if (process.env.NODE_ENV === "production" && !process.env.ALLOW_PROD_SEED) {
    throw new Error(
      "Seeder refused to run in production. Set ALLOW_PROD_SEED=true to override.",
    );
  }

  console.log("🌱 Seeding the training library database...");

  // Upsert admin user
  await db
    .insert(users)
    .values({
      ghsStaffId: "GHS-000001",
      email: ADMIN_EMAIL,
      fullName: "GHS System Administrator",
      role: "SYSTEM_ADMIN",
      isActive: true,
    })
    .onConflictDoUpdate({
      target: users.ghsStaffId,
      set: { role: "SYSTEM_ADMIN", isActive: true, updatedAt: new Date() },
    });

  // ── Programme taxonomy (fields → areas) ───────────────────────────────────
  // Upserted on the code, so re-running after GHS revises the list updates the
  // names in place instead of duplicating rows — and an area added by hand from
  // /programme-fields is never touched. Sort order follows the source document.
  for (const [index, field] of PROGRAMME_FIELDS.entries()) {
    const [row] = await db
      .insert(programmeFields)
      .values({ code: field.code, name: field.name, sortOrder: index * 10 })
      .onConflictDoUpdate({
        target: programmeFields.code,
        set: { name: field.name, sortOrder: index * 10, updatedAt: new Date() },
      })
      .returning({ id: programmeFields.id });

    for (const [areaIndex, area] of field.areas.entries()) {
      await db
        .insert(programmeAreas)
        .values({
          fieldId: row.id,
          code: area.code,
          name: area.name,
          sortOrder: areaIndex * 10,
        })
        .onConflictDoUpdate({
          target: programmeAreas.code,
          set: {
            fieldId: row.id,
            name: area.name,
            sortOrder: areaIndex * 10,
            updatedAt: new Date(),
          },
        });
    }
  }

  console.log(
    `   Programme taxonomy: ${PROGRAMME_FIELDS.length} fields, ${flatProgrammeAreas().length} areas`,
  );

  // ── Reference geography ───────────────────────────────────────────────────
  const geography = await seedGeography(db);
  console.log(
    `   Geography: ${geography.regions} regions, ${geography.districts} Upper West districts, ` +
      `${geography.subDistricts} sub-districts, ${geography.facilities} facilities`,
  );

  /*
   * Be explicit about the boundary between reference data and real content.
   * The only account row created here is a passwordless bootstrap administrator;
   * staff identities come from the authorised GHS roster. Training materials and
   * training sessions are never fabricated by the seed.
   */
  const [{ people }] = await db
    .select({ people: sql<number>`count(*)::int` })
    .from(users)
    .where(eq(users.role, "LEARNER"));

  console.log("✅ Seed complete");
  console.log(`   Bootstrap administrator: ${ADMIN_EMAIL} (GHS-000001; credentials unchanged by this seed)`);
  console.log("   Training materials: none created. Add only approved, source-backed resources through authoring.");
  console.log("   Training sessions: none created. Record only verified sessions.");
  if (people === 0) {
    console.log("");
    console.log("   Learner accounts: none. Staff identities come from the authorised GHS staff sheet,");
    console.log("   which is personal data and is not included in this repository. Import it next:");
    console.log('     npm run staff:import -- --file "<path to Staff Data.csv>" --dry-run');
    console.log('     npm run staff:import -- --file "<path to Staff Data.csv>"');
    console.log("   Then check the result with: npm run staff:status");
  } else {
    console.log(`   Learner accounts already in the directory: ${people} (npm run staff:status for the breakdown)`);
  }
}

main().catch((e) => {
  console.error("❌ Seed failed:", e.message);
  process.exit(1);
});
