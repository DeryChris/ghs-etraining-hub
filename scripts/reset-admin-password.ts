import "dotenv/config";
import { createHash } from "node:crypto";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { client, db } from "../src/db/client";
import { users } from "../src/db/schema";

/**
 * Issue a one-time password reset link, for the "locked out and there is no
 * e-mail delivery yet" case.
 *
 *   npx tsx scripts/reset-admin-password.ts you@ghs.gov.gh
 *
 * Before the Neon migration this called the Supabase admin API to set a password
 * directly. Now it mints a token that only a hash of is stored — with a one-hour
 * expiry — and prints the URL an administrator can hand over in person or over
 * WhatsApp. Opening it lands on /reset-password, where the person chooses their
 * own password. Nothing is e-mailed; nothing about the old password is exposed.
 */
async function main(): Promise<void> {
  const email = (process.argv[2] ?? process.env.SEED_ADMIN_EMAIL)?.trim().toLowerCase();
  if (!email) {
    console.error("Usage: npx tsx scripts/reset-admin-password.ts <email>");
    process.exit(1);
  }

  const [row] = await db
    .select({ id: users.id, fullName: users.fullName, role: users.role, isActive: users.isActive })
    .from(users)
    .where(eq(sql`lower(${users.email})`, email))
    .limit(1);

  if (!row) {
    console.error(`✖ No directory row for ${email}.`);
    process.exit(1);
  }
  if (!row.isActive) {
    console.error(`✖ ${row.fullName} is deactivated. Reactivate them before issuing a reset.`);
    process.exit(1);
  }

  const token = `${randomUUID()}${randomUUID()}`.replace(/-/g, "");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await db
    .update(users)
    .set({ passwordResetToken: tokenHash, passwordResetExpiresAt: expiresAt })
    .where(eq(users.id, row.id));

  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  const url = `${base}/reset-password?token=${token}`;

  console.log(`✔ Reset link issued for ${row.fullName} <${email}> (role ${row.role})`);
  console.log("");
  console.log(`  ${url}`);
  console.log("");
  console.log("  Works once, expires in one hour, and is stored only as a SHA-256 hash.");
  console.log("  Hand it to the person directly — it is not e-mailed by this pilot.");
}

main()
  .catch((error: unknown) => {
    console.error("✖ Failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end({ timeout: 5 });
  });
