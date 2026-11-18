import "dotenv/config";
import { db } from "./client";
import {
  users,
  categories,
  spaces,
  materials,
  regions,
  districts,
  subDistricts,
  facilities,
  programmeFields,
  programmeAreas,
} from "./schema";
import { eq } from "drizzle-orm";
import { REGIONS, UPPER_WEST_DISTRICTS, UPPER_WEST_REGION_CODE } from "./data/geography";
import { PROGRAMME_FIELDS, flatProgrammeAreas } from "./data/programme-taxonomy";

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@ghs.gov.gh";
// The seeded admin has no password here. Provision its login with scripts/provision-auth-user.ts.

async function main() {
  if (process.env.NODE_ENV === "production" && !process.env.ALLOW_PROD_SEED) {
    throw new Error("Seeder refused to run in production. Set ALLOW_PROD_SEED=true to override.");
  }

  console.log("🌱 Seeding the training library database...");

  // Upsert admin user
  const [admin] = await db.insert(users).values({
    ghsStaffId: "GHS-000001",
    email: ADMIN_EMAIL,
    fullName: "GHS System Administrator",
    role: "SYSTEM_ADMIN",
    directorate: "HR Directorate",
    region: "Greater Accra",
    facility: "GHS HQ, Accra",
    isActive: true,
  }).onConflictDoUpdate({
    target: users.ghsStaffId,
    set: { role: "SYSTEM_ADMIN", isActive: true, updatedAt: new Date() },
  }).returning();

  // Upsert categories
  const categoryData = [
    { code: "CAT-PHD-01", name: "Public Health Directorate", description: "Public health programs and disease surveillance" },
    { code: "CAT-ICD-02", name: "Institutional Care Division", description: "Clinical care protocols and SOPs" },
    { code: "CAT-FHD-03", name: "Family Health Division", description: "Maternal, newborn and child health" },
    { code: "CAT-DCD-04", name: "Disease Control Department", description: "Communicable disease control" },
    { code: "CAT-HPD-05", name: "Health Promotion Division", description: "Health education and promotion" },
  ];

  for (const cat of categoryData) {
    await db.insert(categories).values(cat).onConflictDoUpdate({
      target: categories.code,
      set: { name: cat.name, description: cat.description, updatedAt: new Date() },
    });
  }

  const phdCat = await db.select().from(categories).where(eq(categories.code, "CAT-PHD-01")).limit(1);
  const icdCat = await db.select().from(categories).where(eq(categories.code, "CAT-ICD-02")).limit(1);

  if (phdCat[0] && icdCat[0]) {
    // Upsert spaces
    await db.insert(spaces).values({
      slug: "infection-prevention-control",
      title: "Infection Prevention & Control (IPC)",
      description: "IPC protocols for all GHS facilities",
      categoryId: phdCat[0].id,
      createdById: admin.id,
    }).onConflictDoUpdate({
      target: spaces.slug,
      set: { title: "Infection Prevention & Control (IPC)", updatedAt: new Date() },
    });

    await db.insert(spaces).values({
      slug: "cold-chain-management",
      title: "Cold Chain Management",
      description: "Vaccine refrigeration and logistics protocols",
      categoryId: phdCat[0].id,
      createdById: admin.id,
    }).onConflictDoUpdate({
      target: spaces.slug,
      set: { title: "Cold Chain Management", updatedAt: new Date() },
    });

    await db.insert(spaces).values({
      slug: "maternal-newborn-care",
      title: "Maternal & Newborn Care",
      description: "Maternal and newborn health protocols",
      categoryId: icdCat[0].id,
      createdById: admin.id,
    }).onConflictDoUpdate({
      target: spaces.slug,
      set: { title: "Maternal & Newborn Care", updatedAt: new Date() },
    });
  }

  // Upsert materials
  const ipcSpace = await db.select().from(spaces).where(eq(spaces.slug, "infection-prevention-control")).limit(1);
  if (ipcSpace[0]) {
    const seededMaterial = {
      title: "IPC Core Protocol 2026",
      summary: "Core infection prevention and control standard operating procedure",
      type: "DOCUMENT" as const,
      priority: "CRITICAL" as const,
      requiresAcknowledgement: true,
      estimatedMinutes: 45,
      cpdCreditsX10: 50,
      spaceId: ipcSpace[0].id,
      authorId: admin.id,
      state: "PUBLISHED" as const,
      isPublished: true,
    };
    // The unique key (space_id, title) makes a second run an update, not a duplicate.
    await db.insert(materials).values(seededMaterial).onConflictDoUpdate({
      target: [materials.spaceId, materials.title],
      set: {
        summary: seededMaterial.summary,
        priority: seededMaterial.priority,
        requiresAcknowledgement: seededMaterial.requiresAcknowledgement,
        estimatedMinutes: seededMaterial.estimatedMinutes,
        cpdCreditsX10: seededMaterial.cpdCreditsX10,
        state: seededMaterial.state,
        isPublished: seededMaterial.isPublished,
        updatedAt: new Date(),
      },
    });
  }

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
          set: { fieldId: row.id, name: area.name, sortOrder: areaIndex * 10, updatedAt: new Date() },
        });
    }
  }

  console.log(
    `   Programme taxonomy: ${PROGRAMME_FIELDS.length} fields, ${flatProgrammeAreas().length} areas`,
  );

  // ── Reference geography ───────────────────────────────────────────────────
  // Upserted on the natural key, so re-running after GHS supplies a fuller
  // facility list adds rows instead of duplicating them.
  for (const region of REGIONS) {
    await db
      .insert(regions)
      .values(region)
      .onConflictDoUpdate({ target: regions.code, set: { name: region.name } });
  }

  const [upperWest] = await db.select().from(regions).where(eq(regions.code, UPPER_WEST_REGION_CODE)).limit(1);
  if (upperWest) {
    for (const district of UPPER_WEST_DISTRICTS) {
      const [row] = await db
        .insert(districts)
        .values({ regionId: upperWest.id, name: district.name, kind: district.kind, capital: district.capital })
        .onConflictDoUpdate({
          target: [districts.regionId, districts.name],
          set: { kind: district.kind, capital: district.capital },
        })
        .returning();

      for (const name of district.subDistricts) {
        await db
          .insert(subDistricts)
          .values({ districtId: row.id, name })
          .onConflictDoUpdate({ target: [subDistricts.districtId, subDistricts.name], set: { name } });
      }

      for (const facility of district.facilities) {
        await db
          .insert(facilities)
          .values({
            districtId: row.id,
            name: facility.name,
            type: facility.type,
            ownership: facility.ownership ?? "GHS",
          })
          .onConflictDoUpdate({
            target: [facilities.districtId, facilities.name],
            set: { type: facility.type, ownership: facility.ownership ?? "GHS" },
          });
      }
    }
    console.log(
      `   Geography: ${REGIONS.length} regions, ${UPPER_WEST_DISTRICTS.length} Upper West districts, ` +
        `${UPPER_WEST_DISTRICTS.reduce((n, d) => n + d.facilities.length, 0)} facilities`,
    );
  }

  console.log("✅ Seed complete");
  console.log(`   Admin: ${ADMIN_EMAIL} (GHS-000001)`);
}

main().catch((e) => {
  console.error("❌ Seed failed:", e.message);
  process.exit(1);
});
