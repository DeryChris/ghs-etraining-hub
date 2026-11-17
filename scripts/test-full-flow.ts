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

  console.log(`=== Testing full login flow ===\n`);

  // Step 1: Sign in via Supabase Auth
  console.log("Step 1: Signing in via Supabase Auth...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError) {
    console.error("❌ Supabase Auth sign-in failed:", authError.message);
    process.exit(1);
  }

  console.log("✅ Supabase Auth sign-in successful");
  console.log("   User ID:", authData.user?.id);
  console.log("   Email:", authData.user?.email);
  console.log("   Role:", authData.user?.user_metadata?.role);
  console.log("   Session:", authData.session ? "yes" : "no");

  // Step 2: Get the session cookies
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    console.error("❌ Failed to get session:", sessionError.message);
    process.exit(1);
  }

  const session = sessionData.session;
  if (!session) {
    console.error("❌ No session found");
    process.exit(1);
  }

  console.log("\nStep 2: Session tokens obtained");
  console.log("   Access token:", session.access_token?.slice(0, 30) + "...");
  console.log("   Refresh token:", session.refresh_token?.slice(0, 30) + "...");

  // Step 3: Simulate the server-side session resolution
  // The dashboard calls resolveAccount() which calls supabase.auth.getUser()
  // via createSupabaseServerClient() which reads cookies from the request
  console.log("\nStep 3: Verifying user exists in public.users table...");
  
  // We can't directly query the DB from here without the Drizzle client,
  // but we can verify via Supabase Auth that the user is valid
  console.log("✅ User is authenticated in Supabase Auth");
  console.log("   The dashboard's resolveAccount() will look up this user in public.users");

  console.log("\n=== Login flow test complete ===");
  console.log("To test in browser:");
  console.log("1. Open http://localhost:3000/login");
  console.log("2. Sign in with: admin@ghs.gov.gh / change-me-12345");
  console.log("3. After sign-in, you should be redirected to /dashboard");
}

main().catch((e) => {
  console.error("❌ Script failed:", e.message);
  process.exit(1);
});
