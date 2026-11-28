import "@/lib/load-env";
import { sql } from "drizzle-orm";
import { client, db } from "../src/db/client";
import { users } from "../src/db/schema";

/**
 * What the directory actually holds.
 *
 *   npm run staff:status
 *
 * Written because "I seeded the staff" and "the staff are in the database" turned
 * out to be different statements: `db:seed` writes geography and the taxonomy from
 * the repository, while people come from the GHS staff sheet, which is never
 * committed. This prints real counts from the table, so the question is answered
 * by the database rather than by a guess about which command ran.
 */
async function main(): Promise<void> {
  const [row] = await db
    .select({
      total: sql<number>`count(*)::int`,
      staff: sql<number>`count(*) filter (where ${users.role} = 'LEARNER' and ${users.isActive})::int`,
      staffInactive: sql<number>`count(*) filter (where ${users.role} = 'LEARNER' and not ${users.isActive})::int`,
      facilitators: sql<number>`count(*) filter (where ${users.role} = 'FACILITATOR' and ${users.isUnitHead} and ${users.isActive})::int`,
      plainFacilitators: sql<number>`count(*) filter (where ${users.role} = 'FACILITATOR' and not ${users.isUnitHead} and ${users.isActive})::int`,
      admins: sql<number>`count(*) filter (where ${users.role} = 'SYSTEM_ADMIN' and ${users.isActive})::int`,
      neverSignedIn: sql<number>`count(*) filter (where ${users.lastLoginAt} is null)::int`,
      withPassword: sql<number>`count(*) filter (where ${users.passwordHash} is not null)::int`,
    })
    .from(users);

  const people = row ?? {
    total: 0,
    staff: 0,
    staffInactive: 0,
    facilitators: 0,
    plainFacilitators: 0,
    admins: 0,
    neverSignedIn: 0,
    withPassword: 0,
  };

  console.log("Directory");
  console.log(`  total rows          ${people.total}`);
  console.log(`  staff (active)      ${people.staff}${people.staffInactive ? `  (+${people.staffInactive} deactivated)` : ""}`);
  console.log(`  facilitators        ${people.plainFacilitators}`);
  console.log(`  unit heads          ${people.facilitators}`);
  console.log(`  administrators      ${people.admins}`);
  console.log(`  never signed in     ${people.neverSignedIn}`);
  console.log(`  can sign in         ${people.withPassword} (a password hash exists)`);

  if (people.total === 0) {
    console.log("\nThe table is empty. Seed the reference data first:  npm run db:seed");
  } else if (people.staff === 0) {
    console.log("\nNo staff accounts yet. `db:seed` writes geography and the programme taxonomy from the");
    console.log("repository — it does not create people, because the staff sheet is personal data and");
    console.log("is never committed. Import the sheet you were given:");
    console.log("");
    console.log("  npm run staff:import -- --file \"C:\\path\\to\\Staff Data.csv\" --dry-run");
    console.log("  npm run staff:import -- --file \"C:\\path\\to\\Staff Data.csv\"");
    console.log("");
    console.log("Every imported person lands with the Staff role and must choose a password at first sign-in.");
  } else if (people.withPassword === 0) {
    console.log("\nNobody has a password yet. Set one for yourself, then hand out resets as needed:");
    console.log("  npm run user:password -- --email you@ghs.gov.gh --password='…'");
  } else {
    console.log("\nImported staff whose password is still unset can be given one with `npm run user:password`,");
    console.log("or a one-time reset link with `npm run user:reset-password`.");
  }
}

main()
  .catch((error: unknown) => {
    console.error("✖ Failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end({ timeout: 5 });
  });
