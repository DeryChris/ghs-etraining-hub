import "server-only";
import { log } from "@/lib/server/logger";

/**
 * A ceiling on how long a page will wait for one query.
 *
 * A page that awaits the database has no timeout of its own: if a connection is
 * queued behind a saturated pool, a network path stalls, or the database never
 * answers, the request hangs and the visitor keeps the loading skeleton
 * forever. `statement_timeout` on the client covers a query that reached
 * Postgres; this covers everything before that, and it names the section that
 * stalled so the server log says which one.
 *
 * Default is deliberately below the proxy's own limit, so the page can render a
 * "try again" card instead of the platform killing the request.
 */
export const DEFAULT_DEADLINE_MS = 10_000;

export class DeadlineError extends Error {
  constructor(readonly label: string) {
    super(`${label} did not answer within its deadline.`);
    this.name = "DeadlineError";
  }
}

/** Resolves with the work, or rejects with a `DeadlineError` naming the section. */
export async function within<T>(
  label: string,
  work: Promise<T>,
  ms = DEFAULT_DEADLINE_MS,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new DeadlineError(label)), ms);
  });

  try {
    return await Promise.race([work, deadline]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * For sections the page can live without: a timeout yields the fallback (usually
 * `null`) and logs a warning, so the rest of the page still renders.
 */
export async function withinOr<T>(
  label: string,
  work: Promise<T>,
  fallback: T,
  ms = DEFAULT_DEADLINE_MS,
): Promise<T> {
  const started = Date.now();
  try {
    const value = await within(label, work, ms);
    // Only the slow ones are worth a line; a healthy page stays quiet.
    const durationMs = Date.now() - started;
    if (durationMs > 750) log.info({ event: "query.slow", label, durationMs });
    return value;
  } catch (error) {
    if (error instanceof DeadlineError) {
      log.warn({
        event: "query.deadline_exceeded",
        label,
        durationMs: Date.now() - started,
        ms,
      });
    } else {
      log.error({
        event: "query.failed",
        label,
        durationMs: Date.now() - started,
        error,
      });
    }
    return fallback;
  }
}
