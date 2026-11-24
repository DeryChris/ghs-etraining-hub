import { normalizeOrigin } from "@/lib/app-url";

/**
 * The public origin for redirects built inside route handlers. request.nextUrl can
 * report the bind host (e.g. localhost) behind a proxy, so the configured app URL wins.
 * A malformed value is repaired when the intent is obvious and ignored when it is not,
 * rather than throwing inside a redirect.
 */
export function appOrigin(request: Request): string {
  const configured = normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL);
  if (configured) return configured;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (host) {
    const proto = request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.replace(":", "");
    return `${proto}://${host}`;
  }
  return new URL(request.url).origin;
}
