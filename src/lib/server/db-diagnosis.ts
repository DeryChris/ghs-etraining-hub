import "server-only";

import { sql } from "drizzle-orm";
import { db } from "@/db/index";
import { log } from "@/lib/server/logger";
import { EXPECTED_MIGRATIONS, MIGRATIONS, pendingMigrations, type MigrationEntry } from "@/lib/migrations";

export { EXPECTED_MIGRATIONS };

/*
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
 * expects, and — more usefully — which file is missing.
 *
 * Counting alone was not enough. `drizzle-kit migrate` applies a file only when
 * its journal stamp is strictly newer than the newest row in that table, so four
 * entries sharing one stamp left 0017 permanently unapplied while `db:migrate`
 * printed success and `/api/health` reported "17 of 18" with no way to tell
 * which one or why. The stamps are fixed in `src/lib/migrations.ts`; the report
 * below now names the pending file and says when the timestamp rule is what is
 * blocking it, so the next person does not run `db:migrate` twice and give up.
 */

export type MigrationState = "current" | "behind" | "ahead" | "unknown";

export interface MigrationReport {
  state: MigrationState;
  applied: number;
  expected: number;
  /** The files this database has not run yet, oldest first. */
  pending: MigrationEntry[];
  /** The newest migration this database recorded, in epoch milliseconds. */
  lastAppliedAt: number | null;
  /**
   * True when the next pending file's journal stamp is not newer than the last
   * applied migration — the silent-skip case. Drizzle will read the file and
   * quietly decline to run it.
   */
  blockedByTimestamp: boolean;
  /** What to do about it, in the imperative. */
  remedy: string | null;
}

const REMEDY_BEHIND = "Run `npm run db:migrate` (it uses DIRECT_URL, not the pooled host), then restart the app.";

export async function migrationState(): Promise<MigrationReport> {
  try {
    const rows = await db.execute<{ applied: number; last_at: number | null }>(
      sql`select count(*)::int as applied, max(created_at)::bigint as last_at from drizzle.__drizzle_migrations`,
    );
    const list = Array.isArray(rows) ? rows : [];
    const row = list[0] as { applied?: number; last_at?: number | string | null } | undefined;
    const applied = Number(row?.applied ?? 0);
    const lastAppliedAt = row?.last_at === null || row?.last_at === undefined ? null : Number(row.last_at);

    /*
     * An empty ledger means "this database was not built by `drizzle-kit
     * migrate`" — a `db:push` sandbox, or a chain applied by hand — not "this
     * database is behind". Reporting it as behind would fail the health check and
     * page loads on a perfectly correct database, so it is unknown instead, and
     * the table check in /api/health still catches a genuinely missing schema.
     */
    if (applied === 0) {
      return {
        state: "unknown",
        applied,
        expected: EXPECTED_MIGRATIONS,
        pending: [],
        lastAppliedAt,
        blockedByTimestamp: false,
        remedy: null,
      };
    }

    const state: MigrationState =
      applied === EXPECTED_MIGRATIONS ? "current" : applied < EXPECTED_MIGRATIONS ? "behind" : "ahead";
    const pending = state === "behind" ? [...pendingMigrations(applied)] : [];
    const next = pending[0];
    const blockedByTimestamp = next !== undefined && lastAppliedAt !== null && next.when <= lastAppliedAt;

    return {
      state,
      applied,
      expected: EXPECTED_MIGRATIONS,
      pending,
      lastAppliedAt,
      blockedByTimestamp,
      remedy:
        state === "behind"
          ? blockedByTimestamp
            ? "This build's journal is fixed — pull it, then run `npm run db:migrate`, or use `npm run db:repair` to apply the pending file directly and record it."
            : REMEDY_BEHIND
          : state === "ahead"
            ? "The database has run migrations this deployment does not have. Redeploy the site."
            : null,
    };
  } catch (error) {
    // No drizzle schema, a database that refuses the query, or a driver that
    // returns a different shape: unknown is honest, and never fails a request.
    log.warn({ event: "schema.migration_state_unknown", error: String(error) });
    return {
      state: "unknown",
      applied: 0,
      expected: EXPECTED_MIGRATIONS,
      pending: [],
      lastAppliedAt: null,
      blockedByTimestamp: false,
      remedy: null,
    };
  }
}

/** The journal this build ships, for scripts and support questions. */
export function migrationJournal(): readonly MigrationEntry[] {
  return MIGRATIONS;
}
