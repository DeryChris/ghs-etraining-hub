"use client";

import { useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { readRequestIdCookie, shortRequestId } from "@/lib/request-id";

/**
 * Route-level error boundary. It shows one reference the user can quote and
 * never a stack trace: the server log holds the detail under the same
 * `x-request-id` (docs/architecture.md §4).
 */
/** The cookie does not change during a page's lifetime, so nothing to subscribe to. */
const noSubscription = () => () => {};
const serverSnapshot = () => null;

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // The proxy mirrors its request id into a readable cookie; the digest links
  // this screen to the same server log line. Reading it through
  // useSyncExternalStore keeps SSR (no document) and hydration consistent.
  const requestId = useSyncExternalStore(noSubscription, readRequestIdCookie, serverSnapshot);
  const reference = requestId ? shortRequestId(requestId) : (error.digest ?? null);

  useEffect(() => {
    console.error("[ghs-tl] route error", { requestId, digest: error.digest });
  }, [requestId, error.digest]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas p-4">
      <div className="w-full max-w-md space-y-5 rounded-card border border-hairline bg-surface p-8 text-center shadow-panel">
        <h1 className="text-xl font-bold text-ink">This page could not load</h1>
        <p className="text-sm leading-relaxed text-ink-muted">
          Nothing was changed. Try again. If it keeps happening, contact the ICT helpdesk and quote the reference below.
        </p>
        <p className="text-xs text-ink-muted">
          Reference:{" "}
          <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-ink">{reference ?? "unavailable"}</code>
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-control bg-primary px-4 text-sm font-semibold text-primary-ink hover:bg-emerald-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Try again
        </button>
        <Link href="/dashboard" className="block text-xs font-semibold text-primary hover:underline">
          Back to the dashboard
        </Link>
      </div>
    </main>
  );
}
