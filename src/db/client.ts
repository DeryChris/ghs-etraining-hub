import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { databaseTarget } from "@/lib/db-target";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Check your .env file.");
}

/**
 * One pool per process.
 *
 * In development Turbopack re-evaluates modules on every edit. Without this
 * cache each reload built another pooler connection and left the previous one
 * open, so after a few saves queries queued behind exhausted connections and
 * pages sat on their loading skeleton forever. Pinning the client to
 * `globalThis` means a hot reload reuses the pool it already has.
 */
const globalForDb = globalThis as unknown as {
  __ghsPg?: ReturnType<typeof postgres>;
};

/**
 * Connections per instance.
 *
 * Each serverless function instance owns its postgres-js pool. The runtime URL
 * may point at Neon's transaction pooler; keeping this client pool small limits
 * how many upstream connections each warm instance can request. A ceiling of 5
 * is plenty for these short queries, and postgres-js queues additional work.
 */
const POOL_MAX_CEILING = 5;

const configuredPoolMax = Number.parseInt(process.env.DB_POOL_MAX ?? "", 10);
/** What the environment asked for, before the ceiling — reported by /api/health. */
export const poolMaxConfigured = configuredPoolMax > 0 ? configuredPoolMax : POOL_MAX_CEILING;
export const poolMax = Math.min(poolMaxConfigured, POOL_MAX_CEILING);
export const poolMaxSource: "env" | "default" = configuredPoolMax > 0 ? "env" : "default";

/** A host this process can reach over a private or loopback network — no TLS. */
function isLocalHost(host: string): boolean {
  return /^(localhost|127\.0\.0\.1|0\.0\.0\.0|::1)$/i.test(host) || /^(10|127)\./.test(host);
}

/**
 * Neon refuses a connection that did not start with TLS (`no pg_hba.conf entry …
 * SSL off`), and the failure looks like a network fault rather than a missing
 * setting. A connection string pasted from the console carries `?sslmode=require`
 * and is left exactly as it is; one pasted from a dashboard that strips query
 * strings is not, so TLS is requested for any host that is not local. `require`
 * encrypts without demanding a locally-installed CA, which is what libpq's
 * `sslmode=require` means too.
 */
function sslOption(url: string): "require" | undefined {
  try {
    const parsed = new URL(url);
    if (/[?&]sslmode=/.test(url)) return undefined;
    return isLocalHost(parsed.hostname) ? undefined : "require";
  } catch {
    return undefined;
  }
}

function createClient(url: string) {
  const ssl = sslOption(url);
  return postgres(url, {
    ...(ssl ? { ssl } : {}),
    // The pooled endpoint (Neon's `-pooler` host, PgBouncer) cannot hold
    // prepared statements across connections, so keep them off.
    prepare: false,
    max: poolMax,
    // Short-lived: an idle connection here is a slot another instance cannot
    // use. Serverless instances are evicted often enough that churn is cheap.
    idle_timeout: 5,
    max_lifetime: 60 * 30,
    // A cold Vercel function in Washington opening a TLS connection to Paris can
    // take longer than five seconds; at five it gave up and retried, which reads
    // from the browser as a tab that never finishes loading.
    connect_timeout: 15,
    // A statement that reaches Postgres and never returns is cut off here, so a
    // stalled query surfaces as an error the page can show rather than an endless
    // spinner. Page-level deadlines live in `lib/server/deadline.ts`; a queued
    // connection fails fast rather than waiting forever.
    connection: {
      // Dev-friendly: Neon auto-scales but cold starts can add latency.
      // Give queries room to breathe so a slow round trip doesn't surface as
      // a statement timeout to the user. Page-level deadlines in
      // lib/server/deadline.ts (4 s) still cap the total wait.
      statement_timeout: 30_000,
      idle_in_transaction_session_timeout: 10_000,
      application_name: "ghs-training-library",
    },
    onnotice: () => {},
  });
}

/**
 * One line at startup naming the host the server will use. It costs nothing and
 * it settles the question "which connection string is the app actually on?"
 * without ever printing the password — the first thing to check when the
 * terminal says CONNECT_TIMEOUT but the connection string looks right.
 */
if (!globalForDb.__ghsPg) {
  const target = databaseTarget(connectionString);
  console.log(
    `[GHS-UWRHD-TL] database → ${target ? `${target.host}:${target.port}` : "DATABASE_URL could not be parsed"}`,
  );
}

export const client = globalForDb.__ghsPg ?? createClient(connectionString);

if (process.env.NODE_ENV !== "production") globalForDb.__ghsPg = client;

export const db = drizzle(client, { schema });

export type Db = typeof db;
