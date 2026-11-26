import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { buttonClass } from "@/components/ui/button";

/**
 * What a page shows when its data did not arrive in time.
 *
 * The alternative — staying on the loading skeleton — is indistinguishable from a
 * broken page: nothing moves, nothing says why, and the visitor cannot tell
 * whether to wait or to call someone. This card says which page failed, what it
 * costs (nothing was changed), what to try, and where to look next (`/api/health`
 * answers whether the database is reachable and current in one request).
 */
const HEADINGS = {
  timeout: "Taking too long",
  drift: "This page and the database disagree",
  database: "The database is not answering",
  unknown: "Taking too long",
} as const;

const ADVICE = {
  timeout: [
    "Try again in a moment — the second attempt is usually on a warm connection.",
    "If every tab does this, it is the database link, not the page. Open /api/health — it reports whether the database is reachable and whether the schema is current.",
    "Still nothing? Give the ICT helpdesk the time and the request reference below.",
  ],
  drift: [
    "The database has been updated but this deployment has not — a migration has run that this version of the site does not know about, or the reverse.",
    "If a newer version was just deployed, open /api/health and read the migrations block: it says which side is behind.",
    "Redeploy the site (or run npm run db:migrate if the database is the side that is behind), then reload this page.",
  ],
  database: [
    "Nothing was changed. This is the link between the site and its database, not the page you opened.",
    "Open /api/health — if it also fails, the database host is unreachable and ICT needs to look at it.",
    "Give the helpdesk the time and the request reference below.",
  ],
  unknown: [
    "Try again in a moment.",
    "Open /api/health for the current state of the database and the session key.",
    "Still nothing? Give the ICT helpdesk the time and the request reference below.",
  ],
} as const;

export function DataUnavailable({
  title,
  description,
  requestId,
  hint = "unknown",
}: {
  title: string;
  description?: string;
  requestId?: string;
  /** Which kind of failure this was, so the advice is the useful one. */
  hint?: keyof typeof ADVICE;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-card border border-hairline bg-surface p-7 shadow-panel sm:p-9">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-warn">
          <AlertTriangle className="h-4 w-4" aria-hidden />
          {HEADINGS[hint]}
        </p>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted">
          {description ??
            "The request reached the server, but the database did not answer in time. Nothing was changed, and nothing you did caused it."}
        </p>
        <ul className="mt-4 max-w-2xl space-y-1.5 text-sm leading-relaxed text-ink-muted">
          {ADVICE[hint].map((line) =>
            line.includes("/api/health") ? (
              <li key={line}>
                · {line.split("/api/health")[0]}
                <a href="/api/health" className="font-semibold text-primary underline underline-offset-4">
                  /api/health
                </a>
                {line.split("/api/health")[1]}
              </li>
            ) : (
              <li key={line}>· {line}</li>
            ),
          )}
        </ul>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href="." className={buttonClass({ className: "h-11 px-5" })}>
            <RefreshCw className="h-4 w-4" aria-hidden />
            Try again
          </a>
          <Link href="/dashboard" className={buttonClass({ variant: "secondary", className: "h-11 px-5" })}>
            Back to the dashboard
          </Link>
        </div>
        {requestId && (
          <p className="mt-4 font-mono text-xs text-ink-muted">Request {requestId}</p>
        )}
      </div>
    </div>
  );
}
