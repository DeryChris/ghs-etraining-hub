/**
 * The correlation id for a request (docs/architecture.md §4).
 *
 * `src/proxy.ts` mints it, sends it downstream on `x-request-id`, returns it to
 * the browser in the same response header, and mirrors it into this readable
 * cookie so a client-side error boundary can quote the one reference support
 * needs to find the server log line.
 */
export const REQUEST_ID_COOKIE = "ghs_rid";

/** Eight characters is enough to be unique per incident and short enough to read aloud. */
export function shortRequestId(requestId: string): string {
  return requestId.replace(/-/g, "").slice(0, 8);
}

/** Browser only. Returns null during SSR or when the cookie has expired. */
export function readRequestIdCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${REQUEST_ID_COOKIE}=`));
  if (!match) return null;
  const value = decodeURIComponent(match.slice(REQUEST_ID_COOKIE.length + 1));
  return value.length ? value : null;
}
