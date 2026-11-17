import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL || "admin@ghs.gov.gh";
  const password = process.env.SEED_ADMIN_PASSWORD || "change-me-12345";

  console.log("=== Full Login Flow Test ===\n");

  // Step 1: Sign in via Supabase Auth (client-side equivalent)
  console.log("Step 1: Supabase Auth sign-in...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError) {
    console.error("❌ Supabase Auth sign-in failed:", authError.message);
    process.exit(1);
  }
  console.log("✅ Supabase Auth: user authenticated");
  console.log("   User ID:", authData.user!.id);
  console.log("   Session access token:", authData.session!.access_token!.slice(0, 40) + "...");

  // Step 2: Get the auth cookie that the browser would set
  // Supabase sets: sb-<project-ref>-auth-token = base64url(JSON)
  const projectRef = supabaseUrl.split(".")[0].replace("https://", "");
  const cookieName = `sb-${projectRef}-auth-token`;

  const sessionJson = JSON.stringify({
    access_token: authData.session!.access_token,
    refresh_token: authData.session!.refresh_token,
    expires_at: authData.session!.expires_at,
    token_type: "bearer",
    user: authData.user,
  });
  const authCookieValue = Buffer.from(sessionJson).toString("base64url");

  console.log("\nStep 2: Simulating browser cookie...");
  console.log("   Cookie name:", cookieName);
  console.log("   Cookie value (first 80 chars):", authCookieValue.slice(0, 80) + "...");

  // Step 3: Verify user exists in public.users table
  console.log("\nStep 3: Checking public.users table...");
  const { data: users, error: dbError } = await adminSupabase
    .from("users")
    .select("id, ghs_staff_id, email, role, is_active")
    .eq("email", email.toLowerCase());

  if (dbError) {
    console.error("❌ Database query failed:", dbError.message);
    process.exit(1);
  }

  if (users.length === 0) {
    console.error("❌ User NOT found in public.users table");
    process.exit(1);
  }

  const user = users[0];
  console.log("✅ User found in public.users:");
  console.log("   ID:", user.id);
  console.log("   Staff ID:", user.ghs_staff_id);
  console.log("   Email:", user.email);
  console.log("   Role:", user.role);
  console.log("   Active:", user.is_active);

  if (!user.is_active) {
    console.error("❌ User is deactivated");
    process.exit(1);
  }

  // Step 4: Verify the role matches
  if (user.role !== authData.user!.user_metadata?.role) {
    console.warn("⚠️  Role mismatch: DB says", user.role, "but metadata says", authData.user!.user_metadata?.role);
  } else {
    console.log("\n✅ Role matches between DB and Supabase Auth metadata");
  }

  console.log("\n=== All checks passed ===");
  console.log("\nTo test in browser:");
  console.log("1. Open http://localhost:3000/login");
  console.log("2. Sign in with: admin@ghs.gov.gh / change-me-12345");
  console.log("3. After sign-in, you should be redirected to /dashboard");
}

main().catch((e) => {
  console.error("❌ Script failed:", e.message);
  process.exit(1);
});
