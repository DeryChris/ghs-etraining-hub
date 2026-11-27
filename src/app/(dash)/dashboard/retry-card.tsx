import Link from "next/link";
import { buttonClass } from "@/components/ui/button";

/**
 * Shown when the data the page is built from does not arrive in time. It is a
 * real page, not a spinner: the visitor can act on it, and it says what to do
 * next instead of leaving the skeleton up.
 *
 * The reading home uses it when its one substantive read (the record of opens)
 * does not arrive: an empty list would be a claim about the person, not an
 * apology for the database.
 */
export function DashboardRetry({ hint }: { hint?: "drift" | "database" | "timeout" }) {
  return (
    <div className="space-y-6">
      <div className="surface-card p-7 sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-warn">
          {hint === "drift" ? "This page and the database disagree" : "Taking too long"}
        </p>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
          The dashboard could not load its data.
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-muted">
          {hint === "drift" ? (
            <>
              Nothing was changed. The database has been updated but this deployment has not — the
              site and its database are out of step, so the queries this page makes no longer
              match. Open{" "}
              <a href="/api/health" className="font-semibold text-primary underline underline-offset-4">
                /api/health
              </a>{" "}
              to see which side is behind, then redeploy the site (or run{" "}
              <code className="font-mono text-xs">npm run db:migrate</code> if the database is the
              side that is behind).
            </>
          ) : (
            <>
              Nothing was changed. The training library is busy or the connection dropped — try
              again in a moment. If it keeps happening, quote the time in your message to the ICT
              helpdesk.
            </>
          )}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/dashboard" className={buttonClass({ className: "h-11 px-5" })}>
            Try again
          </Link>
          <Link
            href="/catalogue"
            className={buttonClass({
              variant: "secondary",
              className: "h-11 px-5",
            })}
          >
            Go to the library
          </Link>
        </div>
      </div>
    </div>
  );
}
