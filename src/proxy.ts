import { REQUEST_ID_COOKIE } from "@/lib/request-id";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge proxy (Next 16 successor to middleware). It refreshes the Supabase session
 * cookie and redirects anonymous visitors to sign-in. It is a convenience layer:
 * authority is re-checked in server layouts, pages and actions against public.users.
 */
// Public surface: the marketing site, the sign-in pages, certificate verification and the health probe.
// Everything else (the signed-in workspace) requires a session.
const PUBLIC_PATHS = [
  "/",
  "/about",
  "/programmes",
  "/contact",
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
  // Downstream server code (logger, error boundary, actions) logs the same id that
  // the browser receives in the response header, so one reference finds everything.
  request.headers.set("x-request-id", requestId);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return withRequestId(
      new NextResponse("GHS-ELN is not configured. Contact the ICT helpdesk.", { status: 500 }),
      requestId,
    );
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  if (!user && !isPublic(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(`${pathname}${search}`)}`;
    return withRequestId(NextResponse.redirect(url), requestId);
  }

  if (user && pathname === "/login") {
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
