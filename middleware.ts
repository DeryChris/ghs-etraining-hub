import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response = NextResponse.next({ request });
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;

  if (!user && !pathname.startsWith("/login") && !pathname.startsWith("/forgot-password")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user) {
    const userRole = user.user_metadata?.role as string;
    if (pathname.startsWith("/admin") && userRole !== "SYSTEM_ADMIN") {
      return NextResponse.redirect(new URL("/dashboard?error=unauthorized", request.url));
    }
    if (pathname.startsWith("/facilitator") && userRole !== "FACILITATOR" && userRole !== "SYSTEM_ADMIN") {
      return NextResponse.redirect(new URL("/dashboard?error=unauthorized", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
