/**
 * The app's public origin, resolved once and never allowed to throw.
 *
 * `metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL)` used to run at module
 * evaluation, so a single typo in a dashboard field — `https//ghstl.vercel.app`,
 * one missing colon — failed the entire production build with
 * "TypeError: Invalid URL", ten seconds after the compile had succeeded. An
 * environment variable typed by a human should not be able to do that; it should
 * be repaired when the intent is obvious, and fall back when it is not.
 *
 * Resolution order:
 *   1. `NEXT_PUBLIC_APP_URL`, after repair
 *   2. Vercel's own `VERCEL_PROJECT_PRODUCTION_URL` / `VERCEL_URL`
 *   3. localhost, which is only ever right in development
 */

export type AppUrlSource = "env" | "vercel" | "localhost";

export interface AppUrlResolution {
  /** Always a bare origin: scheme and host, no trailing slash, no path. */
  url: string;
  source: AppUrlSource;
  /** The configured value was malformed and was repaired. */
  repaired: boolean;
  /** The configured value, unchanged, when there was one. */
  configured?: string;
}

/**
 * Turns the ways people write a URL into an origin, or null when there is no
 * host to be found. Repairs are deliberately conservative: a missing colon, a
 * missing scheme, stray whitespace, a trailing slash or a path.
 */
export function normalizeOrigin(raw: string | undefined | null): string | null {
  if (!raw) return null;

  let value = raw.trim();
  if (!value) return null;

  // "//example.org" — a protocol-relative URL pasted without its scheme.
  if (value.startsWith("//")) {
    value = `https:${value}`;
  } else if (/^https?\/\//i.test(value)) {
    // "https//example.org" — the colon was dropped.
    value = value.replace(/^(https?)\/\//i, "$1://");
  } else if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) {
    // "example.org" or "example.org/path" — no scheme at all.
    value = `https://${value}`;
  }

  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname) return null;
    // A host with no dot is a typo or a bare word; only localhost is allowed.
    if (!url.hostname.includes(".") && url.hostname !== "localhost") return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function resolveAppUrl(): AppUrlResolution {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  const fromEnv = normalizeOrigin(configured);

  if (fromEnv) {
    const repaired = fromEnv !== (configured ?? "").trim();
    if (repaired) {
      warn(`NEXT_PUBLIC_APP_URL "${configured}" was repaired to ${fromEnv}. Fix the value where it is set.`);
    }
    return { url: fromEnv, source: "env", repaired, configured: configured ?? undefined };
  }

  const fromVercel = normalizeOrigin(
    process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL ?? undefined,
  );
  if (fromVercel) {
    warn(
      `NEXT_PUBLIC_APP_URL is ${configured ? `not a usable URL (${configured})` : "not set"}; ` +
        `falling back to Vercel's own host ${fromVercel}. Set it to the public domain.`,
    );
    return { url: fromVercel, source: "vercel", repaired: false, configured: configured ?? undefined };
  }

  warn(
    `NEXT_PUBLIC_APP_URL is ${configured ? `not a usable URL (${configured})` : "not set"}; ` +
      "falling back to http://localhost:3000. Absolute links will point at the wrong host in production.",
  );
  return { url: "http://localhost:3000", source: "localhost", repaired: false, configured };
}

/** A malformed value is worth a line in the build log, once, on the server. */
function warn(message: string): void {
  if (typeof window === "undefined") console.warn(`[GHS-UWRHD-TL] ${message}`);
}

/** The configured origin for copy ("verify at …"), or "" when there is none to trust. */
export function displayOrigin(): string {
  const configured = normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL);
  return configured ?? "";
}
