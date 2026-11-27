import "dotenv/config";
import { eq, sql } from "drizzle-orm";
import { hash } from "bcryptjs";
import { client, db } from "../src/db/client";
import { users } from "../src/db/schema";

/**
 * Sets the first SYSTEM_ADMIN's password directly in public.users.
 *
 * Before the Neon migration this created a Supabase Auth user. There is no
 * third-party auth any more: password_hash is a bcrypt hash in our own row, and
 * the app signs a session cookie of its own. So this script does the one thing
 * that is actually needed — gives an existing directory row a password.
 *
 *   SEED_ADMIN_PASSWORD='…' npx tsx scripts/create-admin-auth.ts you@ghs.gov.gh
 *
 * If the directory row does not exist yet, seed first (`npm run db:seed`); this
 * script deliberately does not invent staff records.
 */
async function main(): Promise<void> {
  const email = (process.argv[2] ?? process.env.SEED_ADMIN_EMAIL)?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email) {
    console.error("Usage: npx tsx scripts/create-admin-auth.ts <email>");
    process.exit(1);
  }
  if (!password) {
    console.error("Set SEED_ADMIN_PASSWORD for this command (it is never stored in the repository).");
    process.exit(1);
  }
  if (password.length < 10) {
    console.error("Choose a password of at least 10 characters.");
    process.exit(1);
  }

  const [row] = await db
    .select({ id: users.id, fullName: users.fullName, role: users.role })
    .from(users)
    .where(eq(sql`lower(${users.email})`, email))
    .limit(1);

  if (!row) {
    console.error(`✖ No directory row for ${email}. Run the seeder first, then try again.`);
    process.exit(1);
  }

  await db
    .update(users)
    .set({ passwordHash: await hash(password, 12), isActive: true, failedLoginCount: 0, lockedUntil: null })
    .where(eq(users.id, row.id));

  console.log(`✔ Password set for ${row.fullName} <${email}> (role ${row.role})`);
  console.log("  Sign in at /login. Nothing was written to disk: the hash is in public.users.");
}

main()
  .catch((error: unknown) => {
    console.error("✖ Failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end({ timeout: 5 });
  });
