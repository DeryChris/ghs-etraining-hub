import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { users } from "@/db/schema";
import { log } from "@/lib/server/logger";
import { currentRequestId } from "@/lib/server/request-context";

/**
 * Liveness probe for the hosting platform and the uptime monitor. It answers
 * even when the database is down (503) — that is the point of a health check —
 * and the body carries the same request id the logs use, so a page can quote it.
 */
export async function GET() {
  const start = Date.now();
  const requestId = await currentRequestId();
  let dbStatus = "down";

  try {
    await db.select().from(users).limit(1);
    dbStatus = "up";
  } catch (cause) {
    dbStatus = "down";
    log.error({ event: "health.db_unavailable", requestId, error: cause });
  }

  const ok = dbStatus === "up";

  return NextResponse.json(
    {
      ok,
      version: "2.0.0",
      uptime: process.uptime(),
      checks: { db: dbStatus },
      latencyMs: Date.now() - start,
      requestId,
      ...(ok
        ? {}
        : {
            error: {
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
