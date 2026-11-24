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
 * Deliberately small. Supabase's transaction pooler (Supavisor, port 6543) holds
 * a fixed number of server-side connections — 15 on the smaller compute sizes —
 * and every warm Vercel instance that opens ten of them takes most of that pool
 * for itself. The symptom is nasty and misleading: one query at a time answers in
 * ~100 ms (so `/api/health` looks perfect), while a page that fans out four or
 * five queries at once waits for a slot that never frees and hits its deadline.
 *
 * Three per instance is plenty — the queries themselves take milliseconds, so
 * postgres.js queues the rest client-side instead of starving the server pool.
 * Raise it only if the Supavisor pool size and the instance count allow it.
 */
const poolMax = Number.parseInt(process.env.DB_POOL_MAX ?? "", 10) || 3;

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
      statement_timeout: 15_000,
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
