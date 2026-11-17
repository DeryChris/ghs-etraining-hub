import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL || "admin@ghs.gov.gh";
  const password = process.env.SEED_ADMIN_PASSWORD || "change-me-12345";

  console.log(`Resetting password for: ${email}`);

  // Get the user first
  const { data: users, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error("❌ Failed to list users:", listError.message);
    process.exit(1);
  }

  const adminUser = users.users.find((u) => u.email === email);
  if (!adminUser) {
    console.error("❌ User not found:", email);
    process.exit(1);
  }

  console.log("   Found user ID:", adminUser.id);
  console.log("   Email confirmed:", adminUser.email_confirmed_at ? "yes" : "no");
  console.log("   Current role:", adminUser.user_metadata?.role);

  // Update password via admin API
  const { error: updateError } = await supabase.auth.admin.updateUserById(
    adminUser.id,
    { password }
  );

  if (updateError) {
    console.error("❌ Failed to update password:", updateError.message);
    process.exit(1);
  }

  console.log("✅ Password reset successful");
}

main().catch((e) => {
  console.error("❌ Script failed:", e.message);
  process.exit(1);
});
