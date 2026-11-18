import Link from "next/link";
import { DatabaseZap, RefreshCw } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import type { DatabaseTarget } from "@/lib/db-target";

/**
 * The one screen the app can still draw when Postgres is unreachable.
 *
 * It exists because the alternative was worse: the shell waited on the session
 * query, so a blocked connection looked like a page that never finishes loading.
 * Nothing here is a secret — the host and port are what tell you the cause —
 * and every line is something the person at the keyboard can act on.
 */
export function DatabaseUnavailable({
  target,
  code,
}: {
  target: DatabaseTarget | null;
  code?: string;
}) {
  const direct = target?.isSupabaseDirect ?? false;

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas p-4">
      <div className="w-full max-w-xl space-y-5 rounded-card border border-hairline bg-surface p-8 shadow-panel">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-control bg-warn/12 text-warn">
          <DatabaseZap className="h-5 w-5" aria-hidden />
        </span>

        <div className="space-y-2">
          <h1 className="text-xl font-bold text-ink">
            The training database did not answer
          </h1>
          <p className="text-sm leading-relaxed text-ink-muted">
            The application started, but it could not open a connection to
            Postgres. Nothing has been changed and no data was lost — this is a
            connection problem, not a problem with your account.
          </p>
        </div>

        <dl className="space-y-2 rounded-control border border-hairline bg-surface-2/50 p-4 text-xs">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="font-semibold text-ink-muted">Host</dt>
            <dd className="font-mono text-ink">
              {target
                ? `${target.host}:${target.port}`
                : "DATABASE_URL is not set"}
            </dd>
          </div>
          {code && (
            <div className="flex items-baseline justify-between gap-3">
              <dt className="font-semibold text-ink-muted">Driver code</dt>
              <dd className="font-mono text-ink">{code}</dd>
            </div>
          )}
        </dl>

        {code === "CONNECT_TIMEOUT" && (
          <div className="space-y-2 text-sm leading-relaxed text-ink-muted">
            <p className="font-semibold text-ink">What usually causes this</p>
            {direct ? (
              <p>
                <code className="rounded bg-surface-2 px-1 py-0.5 font-mono text-[12px]">
                  {target?.host}
                </code>{" "}
                is Supabase&apos;s direct host, which only resolves to IPv6 — on
                a network without IPv6 the connection simply times out. Use the
                pooler string from Supabase → Connect instead.
              </p>
            ) : (
              <p>
                The host did not accept a TCP connection in time. Either the
                network blocks outbound 5432/6543, or the pooler region in{" "}
                <code className="rounded bg-surface-2 px-1 py-0.5 font-mono text-[12px]">
                  DATABASE_URL
                </code>{" "}
                does not match the project.
              </p>
            )}
            <p>
              Run{" "}
              <code className="rounded bg-surface-2 px-1 py-0.5 font-mono text-[12px]">
                npm run db:doctor
              </code>{" "}
              in the terminal: it prints the DNS answer, the TCP result and the
              TLS handshake, so the failing layer is named.
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-3 pt-1">
          <Link
            href="/dashboard"
            className={buttonClass({ className: "h-11 px-5" })}
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            Try again
          </Link>
          <Link
            href="/library"
            className={buttonClass({
              variant: "secondary",
              className: "h-11 px-5",
            })}
          >
            Go to the library
          </Link>
        </div>
      </div>
    </main>
  );
}
