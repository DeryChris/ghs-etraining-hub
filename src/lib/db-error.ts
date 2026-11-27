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

export interface SchemaProblem {
  /** The SQLSTATE — `42703` (no such column), `42P01` (no such table) … */
  code: string;
  /** What Postgres said, which for these codes names only identifiers. */
  detail: string;
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

/**
 * A failure inside SQLSTATE class 42 is the database *answering*: it parsed the
 * statement, looked for the object, and did not find it. That is a build and a
 * database from different versions, not a connection problem — and calling it
 * one sends people to re-paste a connection string that is already correct.
 * (`42703` is the one that shipped here: the query selected `users.grade`, the
 * database still had `users.cadre`, and the health check said "not reachable".)
 */
const SCHEMA_CODES = new Set([
  "42703", // undefined_column
  "42P01", // undefined_table
  "42P02", // undefined_parameter
  "42883", // undefined_function
  "42704", // undefined_object
  "3F000", // invalid_schema_name
]);

const EXTRA_REMEDIES: Record<string, string> = {
  NO_PG_HBA:
    "The server's host rules refuse this address. With Neon this means the connection arrived without TLS — append `?sslmode=require` to DATABASE_URL.",
  SSL_UNSUPPORTED:
    "The server only speaks TLS but the client did not ask for it. Append `?sslmode=require` to DATABASE_URL.",
};

export function isSchemaError(error: unknown): boolean {
  const code = codeOf(error);
  if (code) return SCHEMA_CODES.has(code);
  // Without a code, the wording still gives it away.
  return /column .* does not exist|relation .* does not exist|undefined_column|undefined_table/i.test(
    messageOf(error),
  );
}

/** The identifiers in a Postgres message, with anything URL-shaped dropped. */
function safeDetail(message: string): string {
  return message
    .replace(/postgres(ql)?:\/\/[^\s"']+/gi, "<connection string>")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);
}

/**
 * Drizzle wraps driver errors: the outer message is `Failed query: select "id",
 * "ghs_staff_id", …` — the statement, truncated before the part that explains
 * anything — and the useful sentence is on `cause`. Prefer the sentence.
 */
function detailOf(error: unknown): string {
  const messages: string[] = [];
  let cursor: unknown = error;
  for (let depth = 0; cursor && typeof cursor === "object" && depth < 5; depth += 1) {
    const message = (cursor as { message?: unknown }).message;
    if (typeof message === "string" && message.length > 0) messages.push(message);
    cursor = (cursor as { cause?: unknown }).cause;
  }
  const explains = messages.find((message) => /\b(column|relation|table|function|type)\b.*does not exist/i.test(message));
  return safeDetail(explains ?? messages.sort((a, b) => a.length - b.length)[0] ?? "");
}

export function schemaProblem(error: unknown): SchemaProblem {
  const code = codeOf(error) ?? "42P01";
  const detail = detailOf(error) || "the database does not have an object this build expects";
  return {
    code,
    detail,
    remedy:
      "This build expects a table or column the database does not have. Apply the pending migration with `npm run db:migrate` (it uses DIRECT_URL — the direct host, not the pooled one), then restart the app.",
  };
}

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
  if (isSchemaError(error)) {
    const problem = schemaProblem(error);
    return { code: problem.code, remedy: `${problem.detail} — ${problem.remedy}` };
  }

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
