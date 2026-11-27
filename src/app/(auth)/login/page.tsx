import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MessageSquareWarning, UserPlus } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { AuthSplit } from "../auth-split";
import { GettingStarted } from "@/components/auth/getting-started";
import { BrandMark } from "@/components/brand/brand-mark";
import { safeNextPath } from "@/lib/safe-redirect";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  "link-expired": "That link has expired or was already used. Request a new one.",
};

/**
 * Sign in, on one card, with the explanation beside it.
 *
 * The form is the right half and holds only what a returning visitor needs: their
 * staff ID, their password, and two ways out — "create an account" for people the
 * directory knows but who have never signed in, and the Complaint Hub for people
 * the form has failed. Both sit under the Sign in button in that order, because
 * that is the order they are reached for.
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
    <AuthSplit aside={<GettingStarted />}>
      <div className="space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <BrandMark size={40} />
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-ink-muted">{SITE.fullName}</p>
            <h1 className="text-2xl font-extrabold tracking-tight text-ink">Sign in</h1>
            <p className="text-[13px] leading-relaxed text-ink-muted">
              Use your GHS Staff ID and the password you chose.
            </p>
          </div>
        </div>

        <LoginForm next={next} initialError={initialError} />

        <div className="space-y-3">
          <Link
            href="/register"
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-pill)] bg-[var(--accent)] px-5 text-[15px] font-bold text-[var(--accent-ink)] transition-colors hover:bg-[var(--accent)]/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <UserPlus className="h-4 w-4" aria-hidden />
            Create an account
          </Link>

          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-hairline" aria-hidden />
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Trouble signing in?</span>
            <span className="h-px flex-1 bg-hairline" aria-hidden />
          </div>

          <Link
            href="/help/report"
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-pill)] border border-danger/40 bg-danger/10 px-5 text-[15px] font-bold text-danger transition-colors hover:bg-danger/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
          >
            <MessageSquareWarning className="h-4 w-4" aria-hidden />
            Complaint Hub
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>

          <p className="text-center text-[12px] leading-relaxed text-ink-muted">
            Cannot sign in or used the wrong contact details during account setup?{" "}
            <Link href="/help/report" className="font-semibold text-primary underline underline-offset-4">
              Report it here
            </Link>{" "}
            and keep your reference number.
          </p>
        </div>
      </div>
    </AuthSplit>
  );
}
