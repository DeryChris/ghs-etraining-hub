import "server-only";
import { createHash } from "node:crypto";
import { and, lt, sql } from "drizzle-orm";
import { db } from "@/db/index";
import { rateLimitWindows } from "@/db/schema";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Identifiers (IP addresses, staff ids) are personal data under Act 843, so the
 * stored bucket key is a salted-shape hash rather than the raw value: the limiter
 * still counts correctly and the table holds no readable identifiers.
 */
export function rateLimitKey(scope: string, identifier: string): string {
  const digest = createHash("sha256").update(`${scope}:${identifier}`).digest("hex").slice(0, 32);
  return `${scope}:${digest}`;
}

/**
 * Fixed-window counter backed by rate_limit_windows.
 *
 * One statement does the read-modify-write, so concurrent requests cannot race
 * past the limit. A window that has expired is reset to 1 rather than counted
 * against the next window.
 */
export async function consumeRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  if (limit <= 0) return { allowed: true, remaining: limit, retryAfterSeconds: 0 };

  const now = new Date();
  const [row] = await db
    .insert(rateLimitWindows)
    .values({ key, count: 1, windowStart: now, resetAt: new Date(now.getTime() + windowSeconds * 1000) })
    .onConflictDoUpdate({
      target: rateLimitWindows.key,
      set: {
        count: sql`case when ${rateLimitWindows.resetAt} <= now() then 1 else ${rateLimitWindows.count} + 1 end`,
        windowStart: sql`case when ${rateLimitWindows.resetAt} <= now() then now() else ${rateLimitWindows.windowStart} end`,
        resetAt: sql`case when ${rateLimitWindows.resetAt} <= now() then now() + make_interval(secs => ${windowSeconds}) else ${rateLimitWindows.resetAt} end`,
      },
    })
    .returning({ count: rateLimitWindows.count, resetAt: rateLimitWindows.resetAt });

  if (!row) return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };

  const retryAfterSeconds = Math.max(0, Math.ceil((row.resetAt.getTime() - Date.now()) / 1000));
  return {
    allowed: row.count <= limit,
    remaining: Math.max(0, limit - row.count),
    retryAfterSeconds,
  };
}

/** Human-readable wait for a form/notice, e.g. "2 minutes". */
export function retryAfterText(seconds: number): string {
  if (seconds <= 60) return "a minute";
  return `${Math.ceil(seconds / 60)} minutes`;
}

/** Old windows are useless once expired; call from a cron or on deploy. */
export async function purgeExpiredRateLimits(): Promise<void> {
  await db.delete(rateLimitWindows).where(and(lt(rateLimitWindows.resetAt, sql`now() - interval '1 day'`)));
}
