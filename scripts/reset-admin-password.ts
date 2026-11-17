import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { requireEnv } from "./lib/env";

/**
 * Resets one staff member's password through the Supabase admin API, for the
 * "locked out before e-mail delivery works" case.
 *
 *   SEED_ADMIN_PASSWORD='…' npx tsx scripts/reset-admin-password.ts you@ghs.gov.gh
 */
const supabase = createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const email = (process.argv[2] ?? process.env.SEED_ADMIN_EMAIL)?.toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email) {
    console.error("Usage: npx tsx scripts/reset-admin-password.ts <email>");
    process.exit(1);
  }
  if (!password) {
    console.error("Set SEED_ADMIN_PASSWORD for this command (it is never stored in the repository).");
    process.exit(1);
  }

  console.log(`Resetting the password for: ${email}`);

  const { data: list, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error("✗ Failed to list users:", listError.message);
    process.exit(1);
  }

  const user = list.users.find((candidate) => candidate.email?.toLowerCase() === email);
  if (!user) {
    console.error("✗ No auth user with that e-mail:", email);
    process.exit(1);
  }

  const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, { password });
  if (updateError) {
    console.error("✗ Failed to update the password:", updateError.message);
    process.exit(1);
  }

  console.log("✓ Password reset. Tell the user to change it after signing in.");
}

main().catch((error: unknown) => {
  console.error("✗ Script failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
