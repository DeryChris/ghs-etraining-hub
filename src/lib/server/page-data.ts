import "server-only";
import { log } from "@/lib/server/logger";
import { currentRequestId } from "@/lib/server/request-context";
import { DeadlineError, within } from "@/lib/server/deadline";

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
 *   const loaded = await withDeadline("geography", Promise.all([listGeography(), getReferenceTotals()]));
 *   if (!loaded.ok) return <DataUnavailable title="Geography did not load" requestId={loaded.requestId} />;
 */
export type DeadlineResult<T> =
  | { ok: true; data: T }
  | { ok: false; requestId: string; reason: "timeout" | "error" };

export async function withDeadline<T>(
  label: string,
  work: Promise<T>,
  ms?: number,
): Promise<DeadlineResult<T>> {
  try {
    const data = await within(label, work, ms);
    return { ok: true, data };
  } catch (error) {
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
}
