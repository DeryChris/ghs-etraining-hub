import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db/index";
import { poolMax, poolMaxSource } from "@/db/client";
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
/** `?deep=serial` isolates the pool, `?deep=pages` the page's own data path. */
type DeepMode = "parallel" | "serial" | "pages";

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
interface ProbeResult {
  label: string;
  ms: number | "timeout";
  rows?: number;
  /** Status code, or the reason it gave up. Never a payload, never a secret. */
  detail?: string;
}

async function probe(
  label: string,
  work: () => Promise<unknown>,
  countOf?: (result: unknown) => number | undefined,
): Promise<ProbeResult> {
  const started = Date.now();
  try {
    const result = await within(`health.${label}`, Promise.resolve().then(work), 4_000);
    const rows = countOf ? countOf(result) : Array.isArray(result) ? result.length : undefined;
    return { label, ms: Date.now() - started, rows };
  } catch (error) {
    log.warn({ event: "health.probe_failed", label, error: String(error) });
    return { label, ms: "timeout", detail: error instanceof Error ? error.name : String(error) };
  }
}

/**
 * `?deep=pages` runs the page's own data functions, not stand-ins for them.
 *
 * The simple probes above can all come back in 200 ms while a tab still hangs:
 * they read one table each, whereas `/trainings` fans out five reads and resolves
 * a session first. This mode times those five plus the Supabase Auth leg, so the
 * answer to "which part of the page never came back" is a URL, not a guess.
 *
 * These six run at once, which is deliberately worse than a real page: pages
 * now load their sections two at a time (see `mapLimit` in page-data.ts). So a
 * slow result here is the pessimistic case, not necessarily what a tab does.
 *
 * The page modules are imported lazily on purpose — a broken page must never be
 * able to take the liveness probe down with it.
 */
async function pageProbes(mode: "parallel" | "serial" = "parallel"): Promise<ProbeResult[]> {
  const { listTrainings, getTrainingSummary, getTrainingFilterOptions } = await import("@/lib/server/training-queries");
  const { listProgrammeFieldOptions } = await import("@/lib/server/taxonomy-queries");
  const { listFields } = await import("@/lib/server/learning-queries");

  const probes = [
    probe(
      "page: trainings list",
      () => listTrainings({ page: 1 }),
      (result) => (result as { items?: unknown[] }).items?.length,
    ),
    probe("page: trainings summary", () => getTrainingSummary()),
    probe("page: training filter options", () => getTrainingFilterOptions()),
    probe("page: programme field options", () => listProgrammeFieldOptions()),
    probe("page: programme catalogue", () => listFields(null)),
    authProbe(),
  ];

  if (mode === "serial") {
    const results: ProbeResult[] = [];
    for (const run of probes) results.push(await run);
    return results;
  }
  return Promise.all(probes);
}

/**
 * The leg no database probe covers. Every signed-in page calls
 * `supabase.auth.getUser()` before it reads anything, and that is a separate
 * service on a separate connection; when it stalls the page sticks and the
 * database looks innocent, exactly as it did here.
 */
async function authProbe(): Promise<ProbeResult> {
  const label = "auth (gotrue /auth/v1/health)";
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  if (!base) return { label, ms: "timeout", detail: "NEXT_PUBLIC_SUPABASE_URL is unset" };

  const started = Date.now();
  try {
    const response = await fetch(`${base}/auth/v1/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(4_000),
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "" },
    });
    return { label, ms: Date.now() - started, detail: `http ${response.status}` };
  } catch (error) {
    log.warn({ event: "health.auth_probe_failed", error: String(error) });
    return { label, ms: "timeout", detail: error instanceof Error ? error.name : String(error) };
  }
}

async function deepProbes(mode: DeepMode = "parallel"): Promise<ProbeResult[]> {
  if (mode === "pages") return pageProbes();

  const probes = [
    probe("session (users)", () => db.select({ id: users.id }).from(users).limit(1)),
    probe("regions", () => db.select({ id: regions.id }).from(regions).limit(50)),
    probe("geography (districts)", () => db.select({ id: districts.id }).from(districts).limit(100)),
    probe("programme fields", () => db.select({ id: programmeFields.id }).from(programmeFields).limit(50)),
    probe("trainings", () => db.select({ id: trainingSessions.id }).from(trainingSessions).limit(50)),
    probe("materials", () => db.select({ id: materials.id }).from(materials).limit(50)),
    probe("complaints", () => db.select({ id: complaints.id }).from(complaints).limit(10)),
  ];
  // Serial mode is the control: same queries, one at a time. If parallel times
  // out and serial is fast, the connection pool is the bottleneck, not the SQL.
  if (mode === "serial") {
    const results: ProbeResult[] = [];
    for (const run of probes) results.push(await run);
    return results;
  }
  return Promise.all(probes);
}

export async function GET(request: Request) {
  const start = Date.now();
  const deepParam = new URL(request.url).searchParams.get("deep");
  const deep = deepParam !== null;
  // `serial` and `pages` each answer a different question; anything else (1, true,
  // an empty value) keeps the original parallel behaviour.
  const deepMode: DeepMode = deepParam === "serial" ? "serial" : deepParam === "pages" ? "pages" : "parallel";
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
              // Connections this instance may open. An old DB_POOL_MAX in the
              // host's environment overrides the fix silently, so report both.
              poolMax,
              poolMaxSource,
              // Supabase's direct host (`db.<ref>.supabase.co`) is IPv6-only;
              // Vercel functions cannot reach it at all.
              directIpv6Host: target.isSupabaseDirect,
            }
          : null;
      })(),
      ...(deep ? { probes: await deepProbes(deepMode), probeMode: deepMode } : {}),
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
