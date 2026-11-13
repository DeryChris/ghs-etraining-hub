import "dotenv/config";
import { db } from "./client";
import { users, categories, spaces, materials } from "./schema";
import { eq } from "drizzle-orm";

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@ghs.gov.gh";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "change-me-12345";

async function main() {
  if (process.env.NODE_ENV === "production" && !process.env.ALLOW_PROD_SEED) {
    throw new Error("Seeder refused to run in production. Set ALLOW_PROD_SEED=true to override.");
  }

  console.log("🌱 Seeding GHS-ELN database...");

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
    await db.insert(materials).values({
      title: "IPC Core Protocol 2026",
      summary: "Core infection prevention and control standard operating procedure",
      type: "DOCUMENT",
      priority: "CRITICAL",
      requiresAcknowledgement: true,
      estimatedMinutes: 45,
      cpdCreditsX10: 50,
      spaceId: ipcSpace[0].id,
      authorId: admin.id,
      state: "PUBLISHED",
      isPublished: true,
    }).onConflictDoNothing();
  }

  console.log("✅ Seed complete");
  console.log(`   Admin: ${ADMIN_EMAIL} (GHS-000001)`);
}

main().catch((e) => {
  console.error("❌ Seed failed:", e.message);
  process.exit(1);
});
