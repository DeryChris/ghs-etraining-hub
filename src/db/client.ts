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
 * Neon is serverless Postgres with no PgBouncer and no transaction pooler
 * connection limits. Each serverless function instance opens its own
 * connections directly. A ceiling of 5 per instance is plenty — the queries
 * themselves take milliseconds, so postgres.js queues the rest client-side
 * instead of starving the pool.
 */
const POOL_MAX_CEILING = 5;

const configuredPoolMax = Number.parseInt(process.env.DB_POOL_MAX ?? "", 10);
/** What the environment asked for, before the ceiling — reported by /api/health. */
export const poolMaxConfigured = configuredPoolMax > 0 ? configuredPoolMax : POOL_MAX_CEILING;
export const poolMax = Math.min(poolMaxConfigured, POOL_MAX_CEILING);
export const poolMaxSource: "env" | "default" = configuredPoolMax > 0 ? "env" : "default";

function createClient(url: string) {
  return postgres(url, {
    // Supabase's pooler cannot use prepared statements across connections.
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
    `[ghs-tl] database → ${target ? `${target.host}:${target.port}` : "DATABASE_URL could not be parsed"}`,
  );
}

export const client = globalForDb.__ghsPg ?? createClient(connectionString);

if (process.env.NODE_ENV !== "production") globalForDb.__ghsPg = client;

export const db = drizzle(client, { schema });

export type Db = typeof db;
