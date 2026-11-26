import "dotenv/config";
import { db } from "./client";
import {
  users,
  materials,
  programmeFields,
  programmeAreas,
  areaFacilitators,
} from "./schema";
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
  const [admin] = await db
    .insert(users)
    .values({
      ghsStaffId: "GHS-000001",
      email: ADMIN_EMAIL,
      fullName: "GHS System Administrator",
      role: "SYSTEM_ADMIN",
      directorate: "HR Directorate",
      region: "Greater Accra",
      facility: "GHS HQ, Accra",
      isActive: true,
    })
    .onConflictDoUpdate({
      target: users.ghsStaffId,
      set: { role: "SYSTEM_ADMIN", isActive: true, updatedAt: new Date() },
    })
    .returning();

  // A facilitator account, assigned to a couple of programme areas so the
  // authoring and review queues are not empty on a fresh install.
  const [facilitator] = await db
    .insert(users)
    .values({
      ghsStaffId: "GHS-000002",
      email: "facilitator@ghs.gov.gh",
      fullName: "GHS Facilitator",
      role: "FACILITATOR",
      directorate: "Public Health Directorate",
      region: "Upper West",
      isActive: true,
    })
    .onConflictDoUpdate({
      target: users.ghsStaffId,
      set: { role: "FACILITATOR", isActive: true, updatedAt: new Date() },
    })
    .returning();

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

  // ── Starter content, filed under programme areas ──────────────────────────
  // Materials live under an area, never under a second taxonomy: what a learner
  // reads and what a training covered are filed in the same place (ADR-0014).
  const seededAreas = await db
    .select({
      id: programmeAreas.id,
      code: programmeAreas.code,
      name: programmeAreas.name,
    })
    .from(programmeAreas);
  const areaByCode = new Map(seededAreas.map((area) => [area.code, area]));

  const starterMaterials = [
    {
      areaCode: "PF-CLIN-03",
      title: "Standard Precautions: Core SOP 2026",
      summary:
        "Hand hygiene, PPE sequence and sharps handling — the protocol every clinical staff member acknowledges.",
      type: "DOCUMENT" as const,
      priority: "CRITICAL" as const,
      requiresAcknowledgement: true,
      estimatedMinutes: 45,
    },
    {
      areaCode: "PF-PH-01",
      title: "Cold Chain and Vaccine Handling",
      summary:
        "Temperature monitoring, the shake test and what to do when the fridge fails overnight.",
      type: "VIDEO" as const,
      priority: "HIGH" as const,
      requiresAcknowledgement: false,
      estimatedMinutes: 25,
    },
    {
      areaCode: "PF-PH-06",
      title: "Integrated Disease Surveillance: Weekly Reporting",
      summary:
        "How to complete and submit the weekly surveillance return, with the thresholds that trigger an alert.",
      type: "DOCUMENT" as const,
      priority: "HIGH" as const,
      requiresAcknowledgement: true,
      estimatedMinutes: 30,
    },
  ];

  let seededMaterialCount = 0;
  for (const starter of starterMaterials) {
    const area = areaByCode.get(starter.areaCode);
    if (!area) continue;

    await db
      .insert(materials)
      .values({
        programmeAreaId: area.id,
        title: starter.title,
        summary: starter.summary,
        type: starter.type,
        priority: starter.priority,
        requiresAcknowledgement: starter.requiresAcknowledgement,
        estimatedMinutes: starter.estimatedMinutes,
        authorId: admin.id,
        state: "PUBLISHED",
        isPublished: true,
      })
      .onConflictDoUpdate({
        target: [materials.programmeAreaId, materials.title],
        set: {
          summary: starter.summary,
          priority: starter.priority,
          requiresAcknowledgement: starter.requiresAcknowledgement,
          estimatedMinutes: starter.estimatedMinutes,
          state: "PUBLISHED",
          isPublished: true,
          updatedAt: new Date(),
        },
      });
    seededMaterialCount += 1;
  }

  if (facilitator) {
    for (const code of ["PF-CLIN-03", "PF-PH-06"]) {
      const area = areaByCode.get(code);
      if (!area) continue;
      await db
        .insert(areaFacilitators)
        .values({ areaId: area.id, userId: facilitator.id })
        .onConflictDoNothing();
    }
  }

  console.log(
    `   Content: ${seededMaterialCount} starter materials filed under programme areas`,
  );

  // ── Reference geography ───────────────────────────────────────────────────
  const geography = await seedGeography(db);
  console.log(
    `   Geography: ${geography.regions} regions, ${geography.districts} Upper West districts, ` +
      `${geography.subDistricts} sub-districts, ${geography.facilities} facilities`,
  );

  console.log("✅ Seed complete");
  console.log(`   Admin: ${ADMIN_EMAIL} (GHS-000001)`);
}

main().catch((e) => {
  console.error("❌ Seed failed:", e.message);
  process.exit(1);
});
