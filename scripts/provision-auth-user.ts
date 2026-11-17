/**
 * Provision (or re-provision) the Supabase Auth login for a staff member who
 * already exists in public.users.
 *
 *   npx tsx scripts/provision-auth-user.ts <email>            # create + temp password
 *   npx tsx scripts/provision-auth-user.ts <email> --reset    # issue a new temp password
 *
 * Why a script and not a UI: onboarding is an ICT operation, not something a
 * facilitator should be able to do from the app. Authority (role, category
 * assignment) lives in public.users and category_facilitators — never in Auth
 * user metadata, which the account holder can edit themselves.
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and DATABASE_URL.
 * The temporary password is printed once; it is never written to the database,
 * to a log, or to disk.
 */
import "dotenv/config";
import { randomInt } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { eq, sql } from "drizzle-orm";
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

async function findAuthUserId(supabase: SupabaseClient, email: string): Promise<string | null> {
  const perPage = 200;
  for (let page = 1; page <= 25; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) fail(`Could not list auth users: ${error.message}`);
    const match = data.users.find((user) => user.email?.toLowerCase() === email);
    if (match) return match.id;
    if (data.users.length < perPage) return null;
  }
  return null;
}

async function main(): Promise<void> {
  const [emailArg, ...flags] = process.argv.slice(2);
  if (!emailArg) fail("Usage: npx tsx scripts/provision-auth-user.ts <email> [--reset]");

  const email = emailArg.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail(`"${emailArg}" is not an e-mail address.`);

  const reset = flags.includes("--reset");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) fail("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.");

  // The directory row is the source of truth for who this person is and what they may do.
  const [directoryRow] = await db
    .select({ id: users.id, fullName: users.fullName, role: users.role, isActive: users.isActive })
    .from(users)
    .where(eq(sql`lower(${users.email})`, email))
    .limit(1);

  if (!directoryRow) {
    fail(
      `No public.users row for ${email}. Insert the staff directory row first (ghs_staff_id, full_name, role, region), then re-run.`,
    );
  }
  if (!directoryRow.isActive) fail(`${directoryRow.fullName} is deactivated. Reactivate the directory row before provisioning.`);

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const password = temporaryPassword();
  const existingId = await findAuthUserId(supabase, email);

  if (existingId) {
    if (!reset) {
      console.log(`ℹ A login already exists for ${email} (auth id ${existingId}).`);
      console.log("  Pass --reset to issue a new temporary password.");
      return;
    }
    const { error } = await supabase.auth.admin.updateUserById(existingId, { password, email_confirm: true });
    if (error) fail(`Could not reset the password: ${error.message}`);
    console.log(`✔ Password reset for ${directoryRow.fullName} <${email}>`);
  } else {
    const { error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) fail(`Could not create the login: ${error.message}`);
    console.log(`✔ Login created for ${directoryRow.fullName} <${email}>`);
  }

  console.log("");
  console.log(`  Role (from the directory, not Auth metadata): ${directoryRow.role}`);
  console.log(`  Temporary password: ${password}`);
  console.log("  Share it out-of-band and ask the staff member to change it at first sign-in.");
  console.log("  This value is not stored anywhere by GHS-ELN.");
}

main()
  .catch((error: unknown) => {
    console.error("✖ Provisioning failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end({ timeout: 5 });
  });
