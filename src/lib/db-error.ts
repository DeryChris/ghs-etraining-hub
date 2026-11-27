/**
 * What a failed database connection actually means.
 *
 * `/api/health` could say "the training database is not reachable", which is
 * true, unhelpful and identical for six different faults: a host name that no
 * longer resolves, a suspended project, a refused port, a wrong password, a
 * missing database, or a TLS handshake the server will not accept. Every one of
 * those has a different fix and none of them is "try again".
 *
 * The error's `code` is the fact that separates them, and it is safe to publish:
 * it is an errno or a SQLSTATE, never the password, the user or the query. The
 * remedy is written as the next action, not as a diagnosis.
 *
 * Pure module — no server-only imports, so the mapping is unit-tested.
 */

export interface ConnectionProblem {
  /** `ENOTFOUND`, `28P01`, `CONNECT_TIMEOUT` … or `UNKNOWN`. */
  code: string;
  /** The next thing to change, in the imperative. */
  remedy: string;
}

const REMEDIES: Record<string, string> = {
  ENOTFOUND:
    "That host name does not resolve, so the endpoint has been renamed or the project deleted. Copy the connection string from Neon → Connect into DATABASE_URL again.",
  EAI_AGAIN:
    "DNS lookup failed inside the function. Retry once; if it repeats, check the host name in DATABASE_URL against Neon → Connect.",
  ECONNREFUSED:
    "Nothing is listening on that host and port. Check the port (5432 for the pooled endpoint) and that the Neon project is running.",
  CONNECT_TIMEOUT:
    "The connection timed out: the function cannot reach that region, or the project is suspended. Open the Neon console once to wake it, then check the region.",
  ETIMEDOUT: "The connection timed out before the server answered. Check the region and whether the Neon project is suspended.",
  EPIPE: "The server closed the socket mid-handshake — usually the project suspending. Open the Neon console once, then retry.",
  "28P01":
    "Postgres rejected the password in DATABASE_URL. Reset the role's password in Neon and paste the full connection string again.",
  "28000":
    "The database refused this role. Check the role name in the connection string and its permissions in Neon.",
  "42501": "The role is not allowed to connect to that database. Grant it USAGE on the database in Neon.",
  "3D000": "That database name does not exist on this host. Check the path in DATABASE_URL (usually /neondb).",
  SELF_SIGNED_CERT_IN_CHAIN:
    "The TLS certificate could not be verified. Append `?sslmode=require` to DATABASE_URL — Neon will not accept a plain-text connection.",
  UNABLE_TO_VERIFY_LEAF_SIGNATURE:
    "The TLS certificate chain is incomplete. Append `?sslmode=require` to DATABASE_URL.",
  DEPTH_ZERO_SELF_SIGNED_CERT:
    "The server presented a certificate this process does not trust. Append `?sslmode=require` to DATABASE_URL.",
  CERT_HAS_EXPIRED: "The server's TLS certificate has expired — this one is Neon's to fix. Check their status page.",
};

/** Messages that carry the diagnosis when the driver gives no code. */
const MESSAGE_HINTS: { match: RegExp; code: string }[] = [
  { match: /no pg_hba\.conf entry/i, code: "NO_PG_HBA" },
  { match: /does not support ssl|server does not support ssl/i, code: "SSL_UNSUPPORTED" },
  { match: /password authentication failed/i, code: "28P01" },
  { match: /database .* does not exist/i, code: "3D000" },
  { match: /getaddrinfo|ENOTFOUND/i, code: "ENOTFOUND" },
  { match: /timeout|timed out/i, code: "CONNECT_TIMEOUT" },
  { match: /self[- ]signed certificate|unable to verify/i, code: "SELF_SIGNED_CERT_IN_CHAIN" },
];

const EXTRA_REMEDIES: Record<string, string> = {
  NO_PG_HBA:
    "The server's host rules refuse this address. With Neon this means the connection arrived without TLS — append `?sslmode=require` to DATABASE_URL.",
  SSL_UNSUPPORTED:
    "The server only speaks TLS but the client did not ask for it. Append `?sslmode=require` to DATABASE_URL.",
};

function codeOf(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const direct = (error as { code?: unknown }).code;
  if (typeof direct === "string" && direct.length > 0) return direct;
  // postgres.js wraps some failures: the errno lives on `cause`.
  return codeOf((error as { cause?: unknown }).cause);
}

function messageOf(error: unknown): string {
  if (!error || typeof error !== "object") return String(error ?? "");
  const parts: string[] = [];
  const message = (error as { message?: unknown }).message;
  if (typeof message === "string") parts.push(message);
  const cause = (error as { cause?: unknown }).cause;
  if (cause && cause !== error) parts.push(messageOf(cause));
  return parts.join(" | ");
}

export function connectionProblem(error: unknown): ConnectionProblem {
  const code = codeOf(error);
  if (code && REMEDIES[code]) return { code, remedy: REMEDIES[code] };

  const message = messageOf(error);
  const hint = MESSAGE_HINTS.find((entry) => entry.match.test(message));
  if (hint) {
    return { code: hint.code, remedy: EXTRA_REMEDIES[hint.code] ?? REMEDIES[hint.code] ?? "Check DATABASE_URL in the host's environment." };
  }

  if (code && EXTRA_REMEDIES[code]) return { code, remedy: EXTRA_REMEDIES[code] };

  return {
    code: code ?? "UNKNOWN",
    // The code is still worth printing even when there is no written remedy: it
    // is the string to search for, or to paste into a support request.
    remedy:
      "Check DATABASE_URL in the host's environment (Neon → Connect), that it ends in `?sslmode=require`, and that the project is awake.",
  };
}

/** The pooled endpoint's host always contains `-pooler`; the direct one never does. */
export function isPooledHost(host: string): boolean {
  return /-pooler\./i.test(host);
}
