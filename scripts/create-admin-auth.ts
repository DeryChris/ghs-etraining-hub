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

  console.log(`Creating Supabase Auth user: ${email}`);

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // auto-confirm so login works immediately
    user_metadata: {
      full_name: "GHS System Administrator",
      role: "SYSTEM_ADMIN",
    },
  });

  if (error) {
    console.error("❌ Failed to create user:", error.message);
    process.exit(1);
  }

  console.log("✅ Supabase Auth user created:", data.user?.id);
  console.log("   Email:", data.user?.email);
  console.log("   Role:", data.user?.user_metadata?.role);
}

main().catch((e) => {
  console.error("❌ Script failed:", e.message);
  process.exit(1);
});
