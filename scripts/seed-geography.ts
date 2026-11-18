import "dotenv/config";

/*
 * `npm run db:seed:geography` — regions, districts, sub-districts and facilities
 * only.
 *
 * The full seeder also creates demo accounts and starter materials, which is not
 * something to run against a database that already holds real people and real
 * material. This command exists for the case that actually happens: the app is
 * deployed, the taxonomy is in place, and the training form cannot get past
 * "Region" because the geography tables are empty.
 *
 * Idempotent: every row upserts on its natural key, so it is safe to run twice
 * and safe to run after GHS supplies a fuller facility list.
 */
async function main() {
  const { db, client } = await import("@/db/client");
  const { seedGeography } = await import("@/db/seed-geography");
  const { databaseTarget } = await import("@/lib/db-target");

  const target = databaseTarget(process.env.DATABASE_URL);
  console.log(
    `🌍 Seeding geography into ${target ? `${target.host}:${target.port}` : "the configured database"}…`,
  );

  try {
    const counts = await seedGeography(db);
    console.log(
      `✅ ${counts.regions} regions, ${counts.districts} districts, ` +
        `${counts.subDistricts} sub-districts, ${counts.facilities} facilities.`,
    );
  } finally {
    await client.end({ timeout: 5 }).catch(() => undefined);
  }
}

main().catch((error) => {
  console.error(
    "❌ Geography seed failed:",
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});
