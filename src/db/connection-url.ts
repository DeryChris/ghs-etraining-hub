/**
 * How the migration connection string is handed to node-postgres.
 *
 * drizzle-kit does not manage this connection itself: it does
 * `new pg.Pool({ connectionString: dbCredentials.url })` and lets
 * pg-connection-string decode the URL. That decoder changed the meaning of
 * `sslmode=require` in 2.7.0: it is now an alias for `verify-full`, so the whole
 * certificate chain is validated (node-postgres prints a SECURITY WARNING saying
 * exactly this). On a machine whose TLS is intercepted — antivirus HTTPS
 * scanning, a corporate proxy, Zscaler/Netskope — the chain ends in that
 * product's self-signed root, and the migration dies with
 *
 *     Error: self-signed certificate in certificate chain
 *     code: 'SELF_SIGNED_CERT_IN_CHAIN'
 *
 * even though the app connects fine: `src/db/client.ts` and `db:doctor` use
 * postgres.js, which encrypts without verifying the chain.
 *
 * libpq's own `require` means "encrypt, do not verify", and pg-connection-string
 * implements exactly that behind `uselibpqcompat=true` (the escape hatch its own
 * warning points at). So migrations run with libpq semantics: the same trust
 * level the application already uses at runtime, no silent divergence between
 * "the app works" and "the migrations cannot connect".
 *
 * Verification stays available and explicit: a URL that already says
 * `sslmode=verify-full`, or that carries `sslrootcert`, is passed through
 * untouched. Nothing here can downgrade a deliberate choice.
 *
 * The URL is only ever appended to — never re-serialised — so a password
 * containing `@`, `#`, `%` or spaces keeps working byte for byte.
 */

export type MigrationTls =
  /** Loopback host: no TLS expected, URL untouched. */
  | { kind: "none" }
  /** No sslmode in the URL: node-postgres defaults apply, URL untouched. */
  | { kind: "driver-default" }
  /** Chain and hostname verified (sslmode=verify-full, or a CA was supplied). */
  | { kind: "verify-full" }
  /** Encrypted, chain not verified (libpq semantics for require/prefer). */
  | { kind: "encrypted-unverified" };

export type MigrationConnection = {
  /** Connection string to hand drizzle-kit. */
  url: string;
  /** True when this function rewrote the URL. */
  changed: boolean;
  tls: MigrationTls;
  /** One sentence, ready for `db:doctor` output or a config warning. */
  summary: string;
};

const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\]|::1)$/i;
const SSL_MODE = /([?&])sslmode=(require|prefer)(?![a-z-])/i;

function summaryFor(tls: MigrationTls): string {
  switch (tls.kind) {
    case "none":
      return "loopback host, TLS not required";
    case "driver-default":
      return "no sslmode in the URL, node-postgres defaults apply";
    case "verify-full":
      return "TLS encrypted and the certificate chain verified";
    case "encrypted-unverified":
      return "TLS encrypted, certificate chain not verified (libpq semantics)";
  }
}

/**
 * Decide how drizzle-kit should connect. Returns the URL to use plus a note for
 * the operator; callers only react when `changed` is true.
 */
export function planMigrationConnection(raw: string): MigrationConnection {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    // Not a URL this function understands: hand it on and let pg complain.
    return {
      url: raw,
      changed: false,
      tls: { kind: "driver-default" },
      summary: "DIRECT_URL is not a parseable URL",
    };
  }

  const unchanged = (tls: MigrationTls): MigrationConnection => ({
    url: raw,
    changed: false,
    tls,
    summary: summaryFor(tls),
  });

  if (LOCAL_HOST.test(parsed.hostname)) return unchanged({ kind: "none" });

  const sslmode = (parsed.searchParams.get("sslmode") ?? "").toLowerCase();
  const libpqCompat = parsed.searchParams.get("uselibpqcompat") === "true";

  // Deliberate verification: never weaken it.
  if (sslmode === "verify-full") return unchanged({ kind: "verify-full" });
  if (parsed.searchParams.has("sslrootcert")) return unchanged({ kind: "verify-full" });
  // Already opted into libpq semantics.
  if (libpqCompat) return unchanged({ kind: "encrypted-unverified" });
  // No TLS requested at all.
  if (sslmode === "disable") return unchanged({ kind: "none" });
  // No sslmode: do not invent one — a self-hosted server may not speak TLS.
  if (sslmode === "") return unchanged({ kind: "driver-default" });
  // verify-ca needs a CA of its own; leave it to fail loudly rather than half-honour it.
  if (sslmode !== "require" && sslmode !== "prefer") return unchanged({ kind: "driver-default" });

  const rewritten = SSL_MODE.test(raw) ? raw.replace(SSL_MODE, (_all, separator, mode) => `${separator}sslmode=${mode.toLowerCase()}`) : raw;
  const appended = `${rewritten}${rewritten.includes("?") ? "&" : "?"}uselibpqcompat=true`;

  return {
    url: appended,
    changed: true,
    tls: { kind: "encrypted-unverified" },
    summary: summaryFor({ kind: "encrypted-unverified" }),
  };
}
