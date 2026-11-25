import { SITE } from "@/lib/site";
import { REQUEST_ID_COOKIE } from "@/lib/request-id";
import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/server/session";
import { cookies } from "next/headers";

/**
 * Edge proxy (Next 16 successor to middleware). It checks the ghs_session cookie
 * and redirects anonymous visitors to sign-in. Authority is re-checked in server
 * layouts, pages and actions against public.users.
 */

// Public surface: the marketing site, the sign-in pages, certificate verification and the health probe.
// Everything else (the signed-in workspace) requires a session.
const PUBLIC_PATHS = [
  "/",
  "/about",
  "/programmes",
  "/contact",
  // The Complaint Hub must work for somebody who cannot sign in at all.
  "/help",
  "/verify",
  "/privacy",
  "/terms",
  "/accessibility",
  "/login",
  "/forgot-password",
  "/auth/callback",
  "/api/health",
];
const STATIC_FILE = /\.(?:svg|png|jpe?g|gif|webp|ico|css|js|map|txt|woff2?)$/i;

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`)) || STATIC_FILE.test(pathname);
}

function withRequestId(response: NextResponse, requestId: string): NextResponse {
  response.headers.set("x-request-id", requestId);
  // Mirrored into a readable cookie so the client-side error boundary can show
  // the same reference the log line carries. It is an opaque uuid, not a secret.
  response.cookies.set(REQUEST_ID_COOKIE, requestId, {
    path: "/",
    sameSite: "lax",
    httpOnly: false,
    maxAge: 60 * 60,
  });
  return response;
}

export async function proxy(request: NextRequest) {
  // Correlates this request with the JSON log lines and the error boundary's digest.
  const requestId = crypto.randomUUID();
  request.headers.set("x-request-id", requestId);

  let response = NextResponse.next({ request });

  // Check for our own session cookie
  const cookieStore = await cookies();
  const token = cookieStore.get("ghs_session")?.value;
  const session = token ? verifySessionToken(token) : null;

  const { pathname, search } = request.nextUrl;

  if (!session && !isPublic(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(`${pathname}${search}`)}`;
    return withRequestId(NextResponse.redirect(url), requestId);
  }

  if (session && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return withRequestId(NextResponse.redirect(url), requestId);
  }

  return withRequestId(response, requestId);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
