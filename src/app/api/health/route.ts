import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { users } from "@/db/schema";

export async function GET() {
  const start = Date.now();
  let dbStatus = "down";

  try {
    await db.select().from(users).limit(1);
    dbStatus = "up";
  } catch {
    dbStatus = "down";
  }

  const ok = dbStatus === "up";

  return NextResponse.json(
    {
      ok,
      version: "2.0.0",
      uptime: process.uptime(),
      checks: {
        db: dbStatus,
      },
      latencyMs: Date.now() - start,
    },
    { status: ok ? 200 : 503 },
  );
}
