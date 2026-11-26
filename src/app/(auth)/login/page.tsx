import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, MessageSquareWarning } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { safeNextPath } from "@/lib/safe-redirect";

export const metadata: Metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  "link-expired": "That link has expired or was already used. Request a new one.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = safeNextPath(params.next);
  const initialError = params.error ? (ERRORS[params.error] ?? null) : null;

  return (
    <>
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Staff sign in</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Welcome back</h1>
        <p className="text-sm leading-relaxed text-ink-muted">
          Sign in with your Staff ID and the password you were given. Your first sign-in asks you to choose your own.
        </p>
      </div>

      <div className="surface-card p-7 sm:p-8">
        <LoginForm next={next} initialError={initialError} />
      </div>

      {/* Directly under Sign in, and loud: a forgotten password or a missing
          record is the reason most people land here twice, and the Hub is where
          that gets answered on the record. */}
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
            Wrong details, forgotten password or no account — the Complaint Hub answers it in writing.
          </span>
        </span>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-primary transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
      </Link>

      <p className="text-center text-xs leading-relaxed text-ink-muted">
        No account yet? Every member of staff on the Upper West payroll has one. If yours is missing, lodge a complaint
        and ICT will add you.
      </p>
    </>
  );
}
