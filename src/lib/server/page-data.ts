import "server-only";
import { log } from "@/lib/server/logger";
import { currentRequestId } from "@/lib/server/request-context";
import { DeadlineError, within } from "@/lib/server/deadline";
import { recordLoad, recordRetry } from "@/lib/server/runtime-stats";

/**
 * Run a page's sections with a cap on how many are in flight at once.
 *
 * `Promise.all` over a page's readers looks harmless, but the readers fan out
 * themselves: `/trainings` asks for five things and three of those ask for two
 * or three more, so a dozen queries leave the instance in the same instant. The
 * pool is deliberately small (see src/db/client.ts) and most of them can only
 * queue — and a cold instance that has to open its connections while twelve
 * queries are already waiting is where a tab went from slow to stuck.
 *
 * Two at a time costs a few tens of milliseconds against a 10 s deadline and
 * removes the stampede. Order is preserved, so destructuring is unchanged.
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
 * Load a page's data under a deadline, and say so when it does not arrive.
 *
 * A page that simply awaits the database has no ceiling: a saturated pool or a
 * stalled socket leaves the loading skeleton on screen forever, which is what
 * "the tab shows nothing" looks like from the outside. This turns that into a
 * value the page can branch on, with the request id the logs carry — so the
 * screen and the server log quote the same reference.
 *
 * Usage:
 *   const loaded = await withDeadline("geography", mapLimit([listGeography, getReferenceTotals]));
 *   if (!loaded.ok) return <DataUnavailable title="Geography did not load" requestId={loaded.requestId} />;
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
  const started = Date.now();
  let error: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const data = await within(label, run(), ms);
      recordLoad({ label, ms: Date.now() - started, outcome: "ok" });
      return { ok: true, data };
    } catch (caught) {
      error = caught;
      // One second attempt, but only for a failure that arrived immediately:
      // a pooled connection that was dead on arrival is replaced by the next
      // query, whereas re-running a page that already spent its whole deadline
      // would just double the wait. A section that timed out is not retried.
      const retryable = typeof work === "function" && !(caught instanceof DeadlineError);
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
