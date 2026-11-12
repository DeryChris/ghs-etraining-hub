import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding GHS eTraining Hub database...");

  // Create Super Admin
  const admin = await prisma.user.upsert({
    where: { ghsStaffId: "GHS-884920" },
    update: {},
    create: {
      ghsStaffId: "GHS-884920",
      email: "kofi.mensah@ghs.gov.gh",
      fullName: "Kofi Mensah",
      role: UserRole.SYSTEM_ADMIN,
      directorate: "HR Directorate",
      region: "Greater Accra",
      facility: "GHS HQ, Accra",
      councilLicenseNo: "GHS/IT-0082",
      isActive: true,
    },
  });

  // Create Facilitator
  const facilitator = await prisma.user.upsert({
    where: { ghsStaffId: "GHS-449102" },
    update: {},
    create: {
      ghsStaffId: "GHS-449102",
      email: "emmanuel.quaye@ghs.gov.gh",
      fullName: "Dr. Emmanuel K. Quaye",
      role: UserRole.FACILITATOR,
      directorate: "Institutional Care Division",
      region: "Greater Accra",
      facility: "Korle Bu Teaching Hospital",
      councilLicenseNo: "MDC/PE-11029",
      isActive: true,
    },
  });

  // Create Learner
  const learner = await prisma.user.upsert({
    where: { ghsStaffId: "GHS-102938" },
    update: {},
    create: {
      ghsStaffId: "GHS-102938",
      email: "perpetual.addo@ghs.gov.gh",
      fullName: "Nurse Perpetual Addo",
      role: UserRole.LEARNER,
      directorate: "Nursing & Midwifery",
      region: "Greater Accra",
      facility: "Greater Accra Regional Hospital (Ridge)",
      councilLicenseNo: "NMC/RNR-2024-8849",
      accumulatedCpdPoints: 28,
      isActive: true,
    },
  });

  // Create Categories (GHS Directorates / National Health Programs)
  const catMaternal = await prisma.category.create({
    data: {
      code: "CAT-MNH-01",
      name: "Maternal & Neonatal Health",
      description:
        "Clinical protocols and training modules for maternal and neonatal care across Ghana health facilities.",
    },
  });

  const catInfectious = await prisma.category.create({
    data: {
      code: "CAT-INF-02",
      name: "Infectious Disease & Epidemiology",
      description:
        "Protocols for infectious disease surveillance, outbreak management, and epidemiological response.",
    },
  });

  const catEmergency = await prisma.category.create({
    data: {
      code: "CAT-EM-03",
      name: "Emergency Medicine & Triage",
      description:
        "Emergency medicine protocols, triage systems, and acute care guidelines.",
    },
  });

  const catEthics = await prisma.category.create({
    data: {
      code: "CAT-CG-04",
      name: "Clinical Governance & Medical Ethics",
      description:
        "Medical ethics, patients charter, clinical governance, and medico-legal practice guidelines.",
    },
  });

  const catPublicHealth = await prisma.category.create({
    data: {
      code: "CAT-PH-05",
      name: "Public Health & Epidemiology",
      description:
        "Public health programs, disease surveillance, and preventive care protocols.",
    },
  });

  // Assign Facilitator to Categories
  await prisma.categoryFacilitator.create({
    data: {
      categoryId: catMaternal.id,
      userId: facilitator.id,
    },
  });

  await prisma.categoryFacilitator.create({
    data: {
      categoryId: catInfectious.id,
      userId: facilitator.id,
    },
  });

  // Create Spaces under Categories
  const spaceEmonc = await prisma.space.create({
    data: {
      slug: "emonc-protocol-2026",
      title: "EmONC Protocol 2026",
      description:
        "Emergency Obstetric and Neonatal Care protocols including PPH management, eclampsia, and neonatal resuscitation.",
      cpdPointsValue: 5,
      categoryId: catMaternal.id,
      createdById: facilitator.id,
    },
  });

  const spaceEclampsia = await prisma.space.create({
    data: {
      slug: "eclampsia-mgso4",
      title: "Eclampsia & MgSO4 Dosage",
      description:
        "Management of pre-eclampsia and eclampsia with magnesium sulfate protocols.",
      cpdPointsValue: 3,
      categoryId: catMaternal.id,
      createdById: facilitator.id,
    },
  });

  const spaceNeonatal = await prisma.space.create({
    data: {
      slug: "neonatal-resuscitation",
      title: "Neonatal Resuscitation Workflow",
      description:
        "Neonatal resuscitation protocols and newborn care guidelines.",
      cpdPointsValue: 4,
      categoryId: catMaternal.id,
      createdById: facilitator.id,
    },
  });

  const spaceLassa = await prisma.space.create({
    data: {
      slug: "lassa-vhf-triage",
      title: "Lassa & VHF Triage Protocol",
      description:
        "Lassa fever and Viral Hemorrhagic Fever triage and isolation protocols.",
      cpdPointsValue: 6,
      categoryId: catInfectious.id,
      createdById: facilitator.id,
    },
  });

  const spaceCholera = await prisma.space.create({
    data: {
      slug: "cholera-outbreak",
      title: "Cholera Outbreak Management",
      description:
        "Cholera surveillance, outbreak response, and case management guidelines.",
      cpdPointsValue: 4,
      categoryId: catInfectious.id,
      createdById: facilitator.id,
    },
  });

  // Create Materials
  await prisma.material.create({
    data: {
      title: "GHS National Guidelines on Postpartum Hemorrhage Management",
      summary:
        "Official GHS ICD directive on AMTSL and first-line treatment for refractory PPH.",
      fileUrl: "ghs_emonc_pph_guidelines_2026.pdf",
      mimeType: "application/pdf",
      formatType: "PDF",
      version: 1,
      isPublished: true,
      spaceId: spaceEmonc.id,
      authorId: facilitator.id,
    },
  });

  await prisma.material.create({
    data: {
      title: "Misoprostol Dosage Matrix for Resource-Limited Settings",
      summary:
        "Heat-stable oxytocin alternative for PPH management where cold-chain is disrupted.",
      fileUrl: "ghs_misoprostol_matrix_2026.pdf",
      mimeType: "application/pdf",
      formatType: "PDF",
      version: 1,
      isPublished: true,
      spaceId: spaceEmonc.id,
      authorId: facilitator.id,
    },
  });

  await prisma.material.create({
    data: {
      title: "MgSO4 Administration Protocol for Eclampsia",
      summary:
        "Loading dose, maintenance dose, and monitoring for magnesium sulfate therapy.",
      fileUrl: "ghs_mgso4_eclampsia_2026.pdf",
      mimeType: "application/pdf",
      formatType: "PDF",
      version: 1,
      isPublished: true,
      spaceId: spaceEclampsia.id,
      authorId: facilitator.id,
    },
  });

  await prisma.material.create({
    data: {
      title: "Cholera Outbreak Surveillance & Response Protocol 2026",
      summary:
        "RDT sampling, case definition thresholds, and notification timelines for cholera outbreaks.",
      fileUrl: "ghs_cholera_outbreak_2026.pdf",
      mimeType: "application/pdf",
      formatType: "PDF",
      version: 1,
      isPublished: true,
      spaceId: spaceCholera.id,
      authorId: facilitator.id,
    },
  });

  // Create CPD Completion for learner
  await prisma.cpdCompletion.create({
    data: {
      userId: learner.id,
      spaceId: spaceEmonc.id,
      pointsAwarded: 5,
      verifiedBy: facilitator.id,
    },
  });

  // Create Audit Logs
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: "SYSTEM_SEEDED",
      entity: "Database",
      entityId: "seed",
      metadata: { categories: 5, spaces: 5, materials: 4, users: 3 },
      ipAddress: "102.176.45.12 (Accra HQ)",
    },
  });

  console.log("✅ Seed completed successfully");
  console.log(`   Admin: ${admin.ghsStaffId} (${admin.role})`);
  console.log(`   Facilitator: ${facilitator.ghsStaffId} (${facilitator.role})`);
  console.log(`   Learner: ${learner.ghsStaffId} (${learner.role})`);
  console.log(`   Categories: 5`);
  console.log(`   Spaces: 5`);
  console.log(`   Materials: 4`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
