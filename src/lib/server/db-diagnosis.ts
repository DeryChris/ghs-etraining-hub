import "server-only";

import { sql } from "drizzle-orm";
import { db } from "@/db/index";
import { log } from "@/lib/server/logger";

/**
 * Is the database the one this build was written for?
 *
 * Twice now a deployment and its database have been out of step, and both times
 * it looked like a performance problem: three tabs showed "taking too long"
 * while every other page was fine, because those three read a table or column
 * that one side of the pair no longer had. The error is instant; the page's
 * deadline turned it into a timeout message, which is the wrong diagnosis.
 *
 * So the app asks the question directly. Drizzle records every migration it has
 * run in `drizzle.__drizzle_migrations`; this file knows how many this build
 * expects. Fewer in the database means `npm run db:migrate` was not run; more
 * means the database has moved on and this deployment is the stale half.
 *
 * Bump EXPECTED_MIGRATIONS in the same commit as any new migration, or the check
 * will call a healthy database behind.
 */
export const EXPECTED_MIGRATIONS = 17;

export type MigrationState = "current" | "behind" | "ahead" | "unknown";

export interface MigrationReport {
  state: MigrationState;
  applied: number;
  expected: number;
}

export async function migrationState(): Promise<MigrationReport> {
  try {
    const rows = await db.execute<{ applied: number }>(
      sql`select count(*)::int as applied from drizzle.__drizzle_migrations`,
    );
    const list = Array.isArray(rows) ? rows : [];
    const applied = Number((list[0] as { applied?: number } | undefined)?.applied ?? 0);
    /*
     * An empty ledger means "this database was not built by `drizzle-kit
     * migrate`" — a `db:push` sandbox, or a chain applied by hand — not "this
     * database is behind". Reporting it as behind would fail the health check and
     * page loads on a perfectly correct database, so it is unknown instead, and
     * the table check in /api/health still catches a genuinely missing schema.
     */
    if (applied === 0) return { state: "unknown", applied, expected: EXPECTED_MIGRATIONS };

    const state: MigrationState =
      applied === EXPECTED_MIGRATIONS ? "current" : applied < EXPECTED_MIGRATIONS ? "behind" : "ahead";
    return { state, applied, expected: EXPECTED_MIGRATIONS };
  } catch (error) {
    // No drizzle schema, a database that refuses the query, or a driver that
    // returns a different shape: unknown is honest, and never fails a request.
    log.warn({ event: "schema.migration_state_unknown", error: String(error) });
    return { state: "unknown", applied: 0, expected: EXPECTED_MIGRATIONS };
  }
}
