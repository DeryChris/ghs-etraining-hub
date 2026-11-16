import { NextResponse, type NextRequest } from "next/server";
import { appOrigin } from "@/lib/app-origin";
import { safeNextPath } from "@/lib/safe-redirect";
import { createSupabaseServerClient } from "@/lib/server/supabase-server";

/**
 * Exchanges the one-time PKCE code from password-reset (or confirmation) emails
 * for a session cookie, then continues to a same-origin page.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const origin = appOrigin(request);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (!code) return NextResponse.redirect(new URL("/login?error=link-expired", origin));

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL("/login?error=link-expired", origin));

  return NextResponse.redirect(new URL(next, origin));
}
