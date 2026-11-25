import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/safe-redirect";
import { resetPassword } from "@/lib/server/auth";

/**
 * Legacy Supabase OAuth callback — no longer used. Supabase Auth has been
 * replaced with local cookie sessions.
 *
 * If a reset token is passed (?token=xxx), verifies it and signs the user in
 * directly, then redirects to the password-reset page so they can set a new
 * password. Otherwise redirects to /login.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const origin = new URL(request.url).origin;
  const next = safeNextPath(searchParams.get("next"));

  const token = searchParams.get("token");
  if (token) {
    const result = await resetPassword(token, "reset-required");
    if (result.ok) {
      // Token consumed — user must set a new password on next page
      const url = new URL("/reset-password", origin);
      url.search = `?token=${encodeURIComponent(token)}`;
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.redirect(
    new URL(`/login?error=link-expired&next=${encodeURIComponent(next ?? "/dashboard")}`, origin),
  );
}
