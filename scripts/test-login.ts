import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL || "admin@ghs.gov.gh";
  const password = process.env.SEED_ADMIN_PASSWORD || "change-me-12345";

  console.log(`Attempting sign-in: ${email}`);

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("❌ Sign-in failed:", error.message);
    process.exit(1);
  }

  console.log("✅ Sign-in successful:");
  console.log("   User ID:", data.user?.id);
  console.log("   Email:", data.user?.email);
  console.log("   Role:", data.user?.user_metadata?.role);
  console.log("   Email confirmed:", data.user?.email_confirmed_at ? "yes" : "no");
}

main().catch((e) => {
  console.error("❌ Script failed:", e.message);
  process.exit(1);
});
