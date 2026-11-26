import { NextResponse } from "next/server";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db/index";
import { poolMax, poolMaxConfigured, poolMaxSource } from "@/db/client";
import { complaints, districts, materials, programmeFields, regions, sessions, trainingSessions, users } from "@/db/schema";
import { databaseTarget } from "@/lib/db-target";
import { sessionSecretProblem } from "@/lib/server/session";
import { within } from "@/lib/server/deadline";
import { mapLimit } from "@/lib/server/page-data";
import { EXPECTED_MIGRATIONS, migrationState } from "@/lib/server/db-diagnosis";
import { loadStats } from "@/lib/server/runtime-stats";
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
/**
 * `?deep=serial` isolates the pool, `?deep=pages` the page's own data path and
 * `?deep=pages-burst` the all-at-once shape that a page used to have.
 */
type DeepMode = "parallel" | "serial" | "pages" | "pages-burst";

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
  "training_comments",
  "file_blobs",
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
  ms = 4_000,
): Promise<ProbeResult> {
  const started = Date.now();
  try {
    const result = await within(`health.${label}`, Promise.resolve().then(work), ms);
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
 * a session first. This mode times those five plus the session lookup, so the
 * answer to "which part of the page never came back" is a URL, not a guess.
 *
 * `?deep=pages` paces those sections two at a time, exactly as the page does
 * now (see `mapLimit` in page-data.ts), so its verdict matches the tab.
 * `?deep=pages-burst` fires everything at once — the shape that was failing —
 * to keep the worst case observable.
 *
 * The page modules are imported lazily on purpose — a broken page must never be
 * able to take the liveness probe down with it.
 */
async function pageProbes(mode: "mirror" | "burst" | "serial" = "mirror"): Promise<ProbeResult[]> {
  const { listTrainings, getTrainingSummary, getTrainingFilterOptions } = await import("@/lib/server/training-queries");
  const { listProgrammeFieldOptions } = await import("@/lib/server/taxonomy-queries");
  const { listFields } = await import("@/lib/server/learning-queries");

  // 1.5 s is generous for reads that answer in 150 ms, and it keeps the
  // whole probe inside one function invocation even when several sections hang.
  const ms = 1_500;

  // The three statements inside "filter options", each timed on its own. If the
  // group hangs while every statement in it answers, the fault is not in the SQL.
  const statements: (() => Promise<ProbeResult>)[] = [
    () => probe("sql: filter years", () => db.selectDistinct({ year: trainingSessions.year }).from(trainingSessions).where(eq(trainingSessions.isArchived, false)), undefined, ms),
    () => probe("sql: filter regions", () => db.select({ id: regions.id, name: regions.name }).from(regions).orderBy(asc(regions.name)), undefined, ms),
    () => probe("sql: filter districts", () => db.select({ id: districts.id, name: districts.name }).from(districts).orderBy(asc(districts.name)), undefined, ms),
  ];

  const sections: (() => Promise<ProbeResult>)[] = [
    () =>
      probe("page: trainings list", () => listTrainings({ page: 1 }), (result) => (result as { items?: unknown[] }).items?.length, ms),
    () => probe("page: trainings summary", () => getTrainingSummary(), undefined, ms),
    () => probe("page: training filter options", () => getTrainingFilterOptions(), undefined, ms),
    () => probe("page: programme field options", () => listProgrammeFieldOptions(), undefined, ms),
    () => probe("page: programme catalogue", () => listFields(null), undefined, ms),
    () => sessionProbe(),
  ];

  if (mode === "serial") {
    const results: ProbeResult[] = [];
    for (const run of [...sections, ...statements]) results.push(await run());
    return results;
  }
  if (mode === "burst") {
    // What the page used to do: everything leaves the instance at once.
    return Promise.all([...sections.map((run) => run()), ...statements.map((run) => run())]);
  }
  // What the page does now: two sections at a time, the statements afterwards.
  const mirrored = await mapLimit(sections, 2);
  const after = await mapLimit(statements, 1);
  return [...mirrored, ...after];
}

/**
 * The leg no table probe covers. Every signed-in page resolves a session before
 * it reads anything, and until the Neon migration that meant a call to Supabase
 * Auth — a separate service on a separate connection that could stall while the
 * database looked innocent.
 *
 * Sessions are now a signed cookie plus one row in `sessions`, so the probe does
 * what the page does: verify a token and read the row back. It uses a throw-away
 * token that cannot match anything, so the answer says whether the cookie layer
 * and the table are working, not whether anybody is signed in.
 */
async function sessionProbe(): Promise<ProbeResult> {
  const label = "session (cookie + sessions table)";
  const started = Date.now();
  try {
    const { verifySessionToken } = await import("@/lib/server/session");
    if (verifySessionToken("probe.invalid") !== null) {
      return { label, ms: Date.now() - started, detail: "forged token was accepted" };
    }
    const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(sessions);
    return { label, ms: Date.now() - started, detail: `sessions rows ${row?.count ?? 0}` };
  } catch (error) {
    log.warn({ event: "health.session_probe_failed", error: String(error) });
    return { label, ms: "timeout", detail: error instanceof Error ? error.name : String(error) };
  }
}

async function deepProbes(mode: DeepMode = "parallel"): Promise<ProbeResult[]> {
  if (mode === "pages") return pageProbes("mirror");
  if (mode === "pages-burst") return pageProbes("burst");

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
  const deepMode: DeepMode =
    deepParam === "serial"
      ? "serial"
      : deepParam === "pages"
        ? "pages"
        : deepParam === "pages-burst"
          ? "pages-burst"
          : "parallel";
  const requestId = await currentRequestId();
  let dbStatus: "up" | "down" = "down";
  let schemaStatus: "current" | "outdated" | "unknown" = "unknown";
  let missing: string[] = [];
  let migrations: Awaited<ReturnType<typeof migrationState>> = {
    state: "unknown",
    applied: 0,
    // The build knows how many it ships even when the database cannot be asked.
    expected: EXPECTED_MIGRATIONS,
    pending: [],
    lastAppliedAt: null,
    blockedByTimestamp: false,
    remedy: null,
  };

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

    // The other direction: a database that has run migrations this build does
    // not know about. Missing tables catch the first half of that story; the
    // count catches the half where the table is still there and a column is not.
    migrations = await migrationState();
    if (migrations.state === "behind" || migrations.state === "ahead") schemaStatus = "outdated";
  } catch (cause) {
    dbStatus = "down";
    log.error({ event: "health.db_unavailable", requestId, error: cause });
  }

  // A deployment with no session key cannot sign anybody in, and the failure
  // surfaced only after a correct password — the least diagnosable moment.
  // Naming it here costs one string comparison and saves that hunt.
  const sessionProblem = sessionSecretProblem();

  const ok = dbStatus === "up" && schemaStatus !== "outdated" && sessionProblem === null;

  return NextResponse.json(
    {
      ok,
      version: "2.0.0",
      // Which build answered. Without this, "still broken" cannot be told apart
      // from "still the previous deploy".
      build: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev",
      uptime: process.uptime(),
      checks: {
        db: dbStatus,
        schema: schemaStatus,
        migrations,
        session: sessionProblem === null ? "configured" : "missing",
        ...(sessionProblem === null ? {} : { sessionHint: sessionProblem }),
      },
      // Host and port only — never the password. This is the single most useful
      // fact when a deployment is slow: 5432 (direct) instead of 6543 (pooler)
      // makes every cold start wait on a fresh Postgres connection.
      database: (() => {
        const target = databaseTarget(process.env.DATABASE_URL);
        return target
          ? {
              host: target.host,
              port: target.port,
              pooled: false,
              // Connections this instance may open. An old DB_POOL_MAX in the
              // host's environment overrides the fix silently, so report both.
              poolMax,
              poolMaxConfigured,
              poolMaxSource,
            }
          : null;
      })(),
      // What this instance did for real visitors, not what a probe can prove.
      // A tab that looks stuck while every probe is green shows up here as
      // either a run of failures or as nothing at all — and those two answers
      // point in opposite directions.
      runtime: loadStats(),
      ...(deep ? { probes: await deepProbes(deepMode), probeMode: deepMode } : {}),
      ...(missing.length > 0 ? { missingTables: missing } : {}),
      latencyMs: Date.now() - start,
      requestId,
      ...(ok
        ? {}
        : {
            error:
              dbStatus === "up"
                ? migrations.state === "ahead"
                  ? {
                      code: "SCHEMA_AHEAD",
                      message: `The database has run ${migrations.applied} migrations and this build expects ${migrations.expected}: the site is running an older deployment than the database. Redeploy the site.`,
                    }
                  : migrations.state === "behind"
                    ? {
                        code: "SCHEMA_BEHIND",
                        message:
                          `The database has run ${migrations.applied} of ${migrations.expected} migrations. ` +
                          (migrations.pending[0] ? `Next: ${migrations.pending[0].tag}. ` : "") +
                          (migrations.blockedByTimestamp
                            ? "drizzle-kit is skipping that file because its journal stamp is not newer than the last applied migration. "
                            : "") +
                          (migrations.remedy ?? ""),
                      }
                    : {
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
