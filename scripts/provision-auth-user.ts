/**
 * Give a staff member who is already in public.users a temporary password.
 *
 *   npx tsx scripts/provision-auth-user.ts <email>            # create + temp password
 *   npx tsx scripts/provision-auth-user.ts <email> --reset    # issue a new temp password
 *
 * Why a script and not a UI: onboarding is an ICT operation, not something a
 * facilitator should be able to do from the app. Authority (role, area
 * assignment) lives in public.users and area_facilitators — never in a third
 * party's user metadata.
 *
 * Since the Neon migration there is no Supabase Auth: the password is a bcrypt
 * hash on the directory row itself, so this writes one column and nothing else.
 * The temporary password is printed once; it is never written to the database,
 * to a log, or to disk.
 */
import "@/lib/load-env";
import { randomInt } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { hash } from "bcryptjs";
import { client, db } from "../src/db/client";
import { users } from "../src/db/schema";

const PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#%*";
const PASSWORD_LENGTH = 16;

function temporaryPassword(): string {
  let value = "";
  for (let index = 0; index < PASSWORD_LENGTH; index += 1) {
    value += PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)];
  }
  return value;
}

function fail(message: string): never {
  console.error(`✖ ${message}`);
  process.exit(1);
}

async function main(): Promise<void> {
  const [emailArg, ...flags] = process.argv.slice(2);
  if (!emailArg) fail("Usage: npx tsx scripts/provision-auth-user.ts <email> [--reset]");

  const email = emailArg.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail(`"${emailArg}" is not an e-mail address.`);

  const reset = flags.includes("--reset");

  // The directory row is the source of truth for who this person is and what they may do.
  const [directoryRow] = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      role: users.role,
      isActive: users.isActive,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(eq(sql`lower(${users.email})`, email))
    .limit(1);

  if (!directoryRow) {
    fail(
      `No public.users row for ${email}. Insert the staff directory row first (ghs_staff_id, full_name, role, region), then re-run.`,
    );
  }
  if (!directoryRow.isActive) fail(`${directoryRow.fullName} is deactivated. Reactivate the directory row before provisioning.`);

  if (directoryRow.passwordHash && !reset) {
    console.log(`ℹ ${email} already has a password.`);
    console.log("  Pass --reset to issue a new temporary one.");
    return;
  }

  const password = temporaryPassword();
  await db
    .update(users)
    .set({ passwordHash: await hash(password, 12), failedLoginCount: 0, lockedUntil: null })
    .where(eq(users.id, directoryRow.id));

  console.log(
    `✔ ${directoryRow.passwordHash ? "Password reset" : "Password set"} for ${directoryRow.fullName} <${email}>`,
  );
  console.log("");
  console.log(`  Role (from the directory, not from any auth service): ${directoryRow.role}`);
  console.log(`  Temporary password: ${password}`);
  console.log("  Share it out-of-band and ask the staff member to change it at first sign-in.");
  console.log("  This value is not stored anywhere by the training library.");
}

main()
  .catch((error: unknown) => {
    console.error("✖ Provisioning failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end({ timeout: 5 });
  });
