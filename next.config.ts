import type { NextConfig } from "next";

/**
 * Security headers apply to every response (next.config headers run on the
 * platform edge, before React renders).
 *
 * Content-Security-Policy notes:
 *  - `script-src` still needs 'unsafe-inline' because Next injects its own
 *    inline bootstrap/flight scripts and the theme boot script must run before
 *    first paint. Migrating to a per-request nonce is tracked in
 *    docs/decisions/0007-csp-and-headers.md; it costs a dynamic render on every
 *    route, so it is a deliberate, documented trade-off rather than an oversight.
 *  - `img-src` is limited to the hosts actually allowed in `images.remotePatterns`.
 *  - Material files live in an S3-compatible bucket (Neon Object Storage by
 *    default) and the browser talks to it directly for uploads and downloads,
 *    so that one origin is allowed in `connect-src`, `img-src` and `media-src`.
 *    It is read from S3_ENDPOINT at build time; with no endpoint set, the
 *    policy stays closed.
 *  - `object-src`, `base-uri`, `form-action` and `frame-ancestors` are locked to
 *    'none'/'self' so injected markup cannot pivot to plugins, base-tag or
 *    off-site form submission.
 */
/**
 * The storage origin the browser is allowed to reach. Presigned URLs point at
 * S3_ENDPOINT, so a policy written against the old Supabase host would block
 * every upload with an opaque CORS error that looks like a network fault.
 */
function storageOrigin(): { origin: string | null; hostname: string | null } {
  const endpoint = process.env.S3_ENDPOINT;
  if (!endpoint) return { origin: null, hostname: null };
  try {
    const url = new URL(endpoint);
    return { origin: url.origin, hostname: url.hostname };
  } catch {
    return { origin: null, hostname: null };
  }
}

const storage = storageOrigin();
const storageSrc = storage.origin ? ` ${storage.origin}` : "";

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'none'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  `img-src 'self' data: blob: https://images.unsplash.com${storageSrc}`,
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  `connect-src 'self'${storageSrc}`,
  `media-src 'self'${storageSrc}`,
  "manifest-src 'self'",
  "worker-src 'self' blob:",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  /*
   * Keep a rendered dynamic route in the browser's router cache for 30 s.
   *
   * Every signed-in page is `force-dynamic`, so by default Next re-fetches a
   * route the moment you come back to it — even if you left it four seconds ago.
   * Hopping between tabs therefore multiplied the database work by the number of
   * hops, which is how a fast page turns into a stalled one.
   *
   * Thirty seconds is the trade: a tab you just visited returns instantly, and
   * anything older than half a minute is re-rendered. Mutations are unaffected —
   * every server action calls `revalidatePath`, which drops the cached entry for
   * the routes it names, so a save still shows the new row immediately.
   */
  experimental: {
    staleTimes: { dynamic: 30, static: 180 },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      ...(storage.hostname ? [{ protocol: "https" as const, hostname: storage.hostname }] : []),
    ],
  },
  /*
   * /analytics was "My activity" — the reading record on a tab of its own. It
   * lives on the dashboard now (ADR‑0027), so a bookmark, a notification written
   * under the old menu or a link in an old e-mail lands somewhere useful instead
   * of on a 404.
   */
  async redirects() {
    return [
      { source: "/analytics", destination: "/dashboard", permanent: true },
      { source: "/analytics/:path*", destination: "/dashboard", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "origin-when-cross-origin" },
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
