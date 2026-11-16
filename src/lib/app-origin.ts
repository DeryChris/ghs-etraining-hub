/**
 * The public origin for redirects built inside route handlers. request.nextUrl can
 * report the bind host (e.g. localhost) behind a proxy, so the configured app URL wins.
 */
export function appOrigin(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      // Malformed configuration: fall back to the request's own origin below.
    }
  }
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (host) {
    const proto = request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.replace(":", "");
    return `${proto}://${host}`;
  }
  return new URL(request.url).origin;
}
