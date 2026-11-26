import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, MessageSquareWarning } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { safeNextPath } from "@/lib/safe-redirect";

export const metadata: Metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  "link-expired": "That link has expired or was already used. Request a new one.",
};

/**
 * Sign in, on one card.
 *
 * The heading, the form and the way out when something is wrong all sit in the
 * same column: people who cannot get in are the ones who read this screen twice,
 * and the Complaint Hub is the route that leaves a record. Nothing here promises
 * an e-mail, because the pilot sends none.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = safeNextPath(params.next);
  const initialError = params.error ? (ERRORS[params.error] ?? null) : null;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">Staff sign in</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Sign in</h1>
        <p className="text-[15px] leading-relaxed text-ink-muted">
          Use your Staff ID and the password you were given. You will be asked to choose your own password the first
          time.
        </p>
      </div>

      <LoginForm next={next} initialError={initialError} />

      {/* Under the Sign in button, and loud: a forgotten password is the reason
          most people land here twice, and the Hub is where it gets answered on
          the record. */}
      <Link
        href="/help/report"
        className="group flex items-center gap-3.5 rounded-card border-2 border-primary/35 bg-primary/[0.06] p-4 text-left transition-colors hover:border-primary hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-primary text-primary-ink shadow-panel">
          <MessageSquareWarning className="h-5 w-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-ink">Cannot get in? Lodge a complaint</span>
          <span className="mt-0.5 block text-[13px] leading-snug text-ink-muted">
            Wrong ID, forgotten password or an account that will not open — the Complaint Hub answers it in writing.
          </span>
        </span>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-primary transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
      </Link>
    </div>
  );
}
