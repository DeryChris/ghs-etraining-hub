import "server-only";
import { log } from "@/lib/server/logger";
import { currentRequestId } from "@/lib/server/request-context";
import { DeadlineError, within } from "@/lib/server/deadline";
import { recordLoad, recordRetry } from "@/lib/server/runtime-stats";

/**
 * Run a page's sections with a cap on how many are in flight at once.
 *
 * Two at a time costs a few tens of milliseconds against a short deadline and
 * removes the connection-pool stampede that made tabs stick on their skeleton.
 * Order is preserved, so destructuring is unchanged.
 */
export async function mapLimit<const T extends readonly (() => Promise<unknown>)[]>(
  sections: T,
  limit = 2,
): Promise<{ [K in keyof T]: Awaited<ReturnType<T[K]>> }> {
  type Results = { [K in keyof T]: Awaited<ReturnType<T[K]>> };
  const results: unknown[] = new Array(sections.length);
  const queue = sections.map((_, index) => index);

  const worker = async () => {
    let index = queue.shift();
    while (index !== undefined) {
      results[index] = await sections[index]();
      index = queue.shift();
    }
  };

  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, sections.length)) }, worker));
  return results as Results;
}

/**
 * Load a page's data under a deadline, with one automatic retry on transient
 * failure. A page that simply awaits the database has no ceiling: a saturated
 * pool or a stalled socket leaves the loading skeleton on screen forever.
 *
 * Retry policy:
 * - DeadlineError (timeout): NOT retried — re-running after the full deadline
 *   would just double the wait.
 * - Other errors (dead connection, reset socket): retried once, because a new
 *   pooled connection often succeeds immediately.
 *
 * Returns either the data or a DeadlineResult with the request id so the page
 * can show a "try again" card quoting the same reference as the server log.
 */
export type DeadlineResult<T> =
  | { ok: true; data: T }
  | { ok: false; requestId: string; reason: "timeout" | "error" };

export async function withDeadline<T>(
  label: string,
  work: Promise<T> | (() => Promise<T>),
  ms?: number,
): Promise<DeadlineResult<T>> {
  const run = typeof work === "function" ? work : () => work;
  const timeoutMs = ms ?? 4_000; // was 10_000 — fail fast so users see a retry card
  const started = Date.now();
  let error: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const data = await within(label, run(), timeoutMs);
      recordLoad({ label, ms: Date.now() - started, outcome: "ok" });
      return { ok: true, data };
    } catch (caught) {
      error = caught;
      // Retry once on non-timeout errors only, and only if we haven't already
      // spent most of the deadline. A timed-out query is not retried — it
      // already consumed its full allowance.
      const retryable =
        typeof work === "function" && !(caught instanceof DeadlineError);
      if (!retryable || Date.now() - started > 2_000) break;
      recordRetry();
      log.warn({ event: "page.data_retry", label, error: caught });
    }
  }

  recordLoad({
    label,
    ms: Date.now() - started,
    outcome: error instanceof DeadlineError ? "timeout" : "error",
  });
  const requestId = (await currentRequestId().catch(() => null)) ?? "";
  log.error({
    event: "page.data_unavailable",
    label,
    requestId,
    timeout: error instanceof DeadlineError,
    error,
  });
  return { ok: false, requestId, reason: error instanceof DeadlineError ? "timeout" : "error" };
}
