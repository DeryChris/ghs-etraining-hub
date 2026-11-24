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
export function DataUnavailable({
  title,
  description,
  requestId,
}: {
  title: string;
  description?: string;
  requestId?: string;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-card border border-hairline bg-surface p-7 shadow-panel sm:p-9">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-warn">
          <AlertTriangle className="h-4 w-4" aria-hidden />
          Taking too long
        </p>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted">
          {description ??
            "The request reached the server, but the database did not answer in time. Nothing was changed, and nothing you did caused it."}
        </p>
        <ul className="mt-4 max-w-2xl space-y-1.5 text-sm leading-relaxed text-ink-muted">
          <li>· Try again in a moment — the second attempt is usually on a warm connection.</li>
          <li>
            · If every tab does this, it is the database link, not the page. Open{" "}
            <a href="/api/health" className="font-semibold text-primary underline underline-offset-4">
              /api/health
            </a>{" "}
            — it reports whether the database is reachable and whether the schema is current.
          </li>
          <li>· Still nothing? Give the ICT helpdesk the time and the request reference below.</li>
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
