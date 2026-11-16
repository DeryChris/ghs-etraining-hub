"use client";

import { useSyncExternalStore } from "react";
import { readRequestIdCookie, shortRequestId } from "@/lib/request-id";

const noSubscription = () => () => {};
const serverSnapshot = () => null;

/**
 * Last-resort boundary: the root layout itself failed. It must render its own
 * <html>, cannot use the design tokens' providers, and must not leak detail.
 */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  const requestId = useSyncExternalStore(noSubscription, readRequestIdCookie, serverSnapshot);
  const reference = requestId ? shortRequestId(requestId) : (error.digest ?? "unavailable");

  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-canvas p-4 text-ink">
        <main className="w-full max-w-md space-y-4 rounded-card border border-hairline bg-surface p-8 text-center shadow-panel">
          <h1 className="text-xl font-bold">The service could not start this page</h1>
          <p className="text-sm leading-relaxed text-ink-muted">
            Nothing was changed. Reload the page. If it still fails, contact the ICT helpdesk and quote the reference
            below.
          </p>
          <p className="text-xs text-ink-muted">
            Reference: <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-ink">{reference}</code>
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-control bg-primary px-4 text-sm font-semibold text-primary-ink"
          >
            Reload
          </button>
        </main>
      </body>
    </html>
  );
}
