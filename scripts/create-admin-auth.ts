import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { requireEnv } from "./lib/env";

/**
 * Creates the first SYSTEM_ADMIN in Supabase Auth. It does not create the
 * public.users row: that is the seeder's job or the app's provisioning flow, so
 * authority still comes from the database rather than from auth metadata.
 *
 *   npx tsx scripts/create-admin-auth.ts you@ghs.gov.gh
 */
const supabase = createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const email = process.argv[2] ?? process.env.SEED_ADMIN_EMAIL;
  if (!email) {
    console.error("Usage: npx tsx scripts/create-admin-auth.ts <email>");
    process.exit(1);
  }

  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!password) {
    console.error("Set SEED_ADMIN_PASSWORD for this command (it is never stored in the repository).");
    process.exit(1);
  }

  console.log(`Creating Supabase Auth user: ${email}`);

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "GHS System Administrator" },
  });

  if (error) {
    console.error("Γ£ù Failed to create the user:", error.message);
    process.exit(1);
  }

  console.log("Γ£ô Auth user created:", data.user?.id);
  console.log("  Next: create the matching public.users row (npm run db:seed, or the admin UI) ΓÇö the app never reads the role from auth metadata.");
}

main().catch((error: unknown) => {
  console.error("Γ£ù Script failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
