import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db/index";
import { complaints, districts, materials, programmeFields, regions, trainingSessions, users } from "@/db/schema";
import { databaseTarget } from "@/lib/db-target";
import { within } from "@/lib/server/deadline";
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
  "complaint_messages",
  "complaints",
  "programme_fields",
  "programme_areas",
  "area_facilitators",
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

/**
 * `?deep=1` times each query the slow tabs depend on, one at a time.
 *
 * When a whole tab "sticks on its skeleton" the useful question is which query
 * never came back — and the answer is not in the browser. Each probe here is the
 * same shape as a real page's read, run under a short deadline, and reported as
 * `ms` or `timeout`. Nothing sensitive is returned: counts and durations only.
 */
async function probe(label: string, work: () => Promise<unknown>): Promise<{ label: string; ms: number | "timeout"; rows?: number }> {
  const started = Date.now();
  try {
    const result = await within(`health.${label}`, Promise.resolve().then(work), 4_000);
    const rows = Array.isArray(result) ? result.length : undefined;
    return { label, ms: Date.now() - started, rows };
  } catch (error) {
    log.warn({ event: "health.probe_failed", label, error: String(error) });
    return { label, ms: "timeout" };
  }
}

async function deepProbes() {
  return Promise.all([
    probe("session (users)", () => db.select({ id: users.id }).from(users).limit(1)),
    probe("regions", () => db.select({ id: regions.id }).from(regions).limit(50)),
    probe("geography (districts)", () => db.select({ id: districts.id }).from(districts).limit(100)),
    probe("programme fields", () => db.select({ id: programmeFields.id }).from(programmeFields).limit(50)),
    probe("trainings", () => db.select({ id: trainingSessions.id }).from(trainingSessions).limit(50)),
    probe("materials", () => db.select({ id: materials.id }).from(materials).limit(50)),
    probe("complaints", () => db.select({ id: complaints.id }).from(complaints).limit(10)),
  ]);
}

export async function GET(request: Request) {
  const start = Date.now();
  const deep = new URL(request.url).searchParams.get("deep") === "1";
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
      // Host and port only — never the password. This is the single most useful
      // fact when a deployment is slow: 5432 (direct) instead of 6543 (pooler)
      // makes every cold start wait on a fresh Postgres connection.
      database: (() => {
        const target = databaseTarget(process.env.DATABASE_URL);
        return target
          ? {
              host: target.host,
              port: target.port,
              pooled: target.port === "6543",
              // Supabase's direct host (`db.<ref>.supabase.co`) is IPv6-only;
              // Vercel functions cannot reach it at all.
              directIpv6Host: target.isSupabaseDirect,
            }
          : null;
      })(),
      ...(deep ? { probes: await deepProbes() } : {}),
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
