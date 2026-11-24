"use client";

import { useEffect } from "react";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";

/**
 * The boundary for a signed-in page that threw while rendering.
 *
 * Before this, an error after the shell had streamed left the page's loading
 * skeleton on screen: the request had finished, so nothing was coming to replace
 * it, and the browser had no reason to say so. A thrown page now says what
 * happened, keeps the menu usable, and quotes the digest the server log carries.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The server logs the same digest; this only marks the browser side.
    console.error("dashboard.segment_error", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="space-y-6">
      <div className="rounded-card border border-hairline bg-surface p-7 shadow-panel sm:p-9">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-danger">This page stopped loading</p>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
          Something went wrong while building this page.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted">
          Nothing you did was saved wrongly — the page simply could not finish. Try it again; if it keeps happening, send
          the reference below to the ICT helpdesk so the server log can be found in one step.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" onClick={reset} className={buttonClass({ className: "h-11 px-5" })}>
            Try again
          </button>
          <Link href="/dashboard" className={buttonClass({ variant: "secondary", className: "h-11 px-5" })}>
            Back to the dashboard
          </Link>
          <a href="/api/health" className={buttonClass({ variant: "ghost", className: "h-11 px-5" })}>
            Check the database link
          </a>
        </div>
        {error.digest && <p className="mt-4 font-mono text-xs text-ink-muted">Reference {error.digest}</p>}
      </div>
    </div>
  );
}
