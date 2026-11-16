"use client";

import { useEffect } from "react";

/** Route-level error boundary. Shows a support reference, never a stack trace. */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Server logs hold the detail; the digest links this screen to that log entry.
    console.error("[ghs-etn] route error", error.digest ?? "no-digest");
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas p-4">
      <div className="w-full max-w-md space-y-5 rounded-card border border-hairline bg-surface p-8 text-center shadow-panel">
        <h1 className="text-xl font-bold text-ink">This page could not load</h1>
        <p className="text-sm leading-relaxed text-ink-muted">
          No data was changed. Try again. If the problem continues, contact the ICT helpdesk and quote the reference below.
        </p>
        <p className="text-xs text-ink-muted">
          Reference: <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-ink">{error.digest ?? "unavailable"}</code>
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-control bg-primary px-4 text-sm font-semibold text-primary-ink hover:bg-emerald-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
