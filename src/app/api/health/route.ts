import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db/index";
import { users } from "@/db/schema";
import { log } from "@/lib/server/logger";
import { currentRequestId } from "@/lib/server/request-context";

/**
 * Liveness probe for the hosting platform and the uptime monitor. It answers
 * even when the database is down (503) — that is the point of a health check —
 * and the body carries the same request id the logs use, so a page can quote it.
 *
 * It also checks that the tables this build expects actually exist. A deploy
 * against a database that is one migration behind is otherwise only discovered
 * when someone opens a page that touches the new table; here it is a named
 * failure with the command that fixes it.
 */

/** Tables added by the newest migration first, so a stale database names itself. */
const REQUIRED_TABLES = [
  "regions",
  "districts",
  "sub_districts",
  "facilities",
  "training_sessions",
  "material_views",
  "materials",
  "users",
] as const;

async function missingTables(): Promise<string[]> {
  const rows = await db.execute<{ missing: string }>(sql`
    select t.name as missing
    from unnest(${sql.raw(`array[${REQUIRED_TABLES.map((name) => `'${name}'`).join(",")}]::text[]`)}) as t(name)
    where to_regclass('public.' || t.name) is null
    order by t.name
  `);
  // postgres-js returns the row array itself, not a `{ rows }` wrapper.
  return (Array.isArray(rows) ? rows : []).map((row) => row.missing);
}

export async function GET() {
  const start = Date.now();
  const requestId = await currentRequestId();
  let dbStatus: "up" | "down" = "down";
  let schemaStatus: "current" | "outdated" | "unknown" = "unknown";
  let missing: string[] = [];

  try {
    await db.select().from(users).limit(1);
    dbStatus = "up";

    try {
      missing = await missingTables();
      schemaStatus = missing.length === 0 ? "current" : "outdated";
    } catch (cause) {
      schemaStatus = "unknown";
      log.error({ event: "health.schema_check_failed", requestId, error: cause });
    }
  } catch (cause) {
    dbStatus = "down";
    log.error({ event: "health.db_unavailable", requestId, error: cause });
  }

  const ok = dbStatus === "up" && schemaStatus !== "outdated";

  return NextResponse.json(
    {
      ok,
      version: "2.0.0",
      uptime: process.uptime(),
      checks: { db: dbStatus, schema: schemaStatus },
      ...(missing.length > 0 ? { missingTables: missing } : {}),
      latencyMs: Date.now() - start,
      requestId,
      ...(ok
        ? {}
        : {
            error:
              dbStatus === "up"
                ? {
                    code: "SCHEMA_OUTDATED",
                    message: `The database is missing ${missing.join(", ")}. Run npm run db:migrate, then restart the app.`,
                  }
                : {
                    code: "UPSTREAM_UNAVAILABLE",
                    message: "The training database is not reachable.",
                  },
          }),
    },
    {
      status: ok ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
