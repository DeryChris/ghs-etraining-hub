import Link from "next/link";
import { KeyRound, Mail } from "lucide-react";

/**
 * Password resets are issued by an administrator, not e-mailed.
 *
 * The previous version sent a Supabase Auth reset mail. On the Neon migration
 * there is no mail provider and no third-party auth service, so promising an
 * e-mail would be a lie the pilot cannot keep. An administrator issues a
 * one-time link (`npm run user:reset-password`), and this page says how to ask
 * for one and what to do next.
 */
export default function ForgotPasswordPage() {
  return (
    <>
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Account</p>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Forgotten your password?</h1>
        <p className="text-sm leading-relaxed text-ink-muted">
          An administrator resets passwords for this pilot. There is no automated e-mail yet, so a person issues the
          link and hands it to you.
        </p>
      </div>

      <div className="space-y-5">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
            <Mail className="h-4 w-4" aria-hidden />
          </span>
          <div className="space-y-2 text-sm leading-relaxed text-ink">
            <p className="font-semibold">1. Ask your administrator for a reset link</p>
            <p className="text-ink-muted">
              Your facility administrator, or the ICT helpdesk, can issue a one-time link from the staff directory. It
              works once and expires after an hour.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
            <KeyRound className="h-4 w-4" aria-hidden />
          </span>
          <div className="space-y-2 text-sm leading-relaxed text-ink">
            <p className="font-semibold">2. Open the link they send you</p>
            <p className="text-ink-muted">
              The link takes you to a page where you choose a new password. Use at least 10 characters — a short phrase
              you can remember works well.
            </p>
          </div>
        </div>

        <p className="rounded-control border border-hairline bg-surface-2 px-4 py-3 text-sm leading-relaxed text-ink-muted">
          Locked out and cannot reach an administrator? Lodge a complaint and say which facility you are at — access
          can be restored from that side.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-center text-sm">
        <Link href="/login" className="font-semibold text-primary underline-offset-4 hover:underline">
          Back to sign in
        </Link>
        <Link href="/help/report" className="font-semibold text-primary underline-offset-4 hover:underline">
          Lodge a complaint
        </Link>
      </div>
    </>
  );
}
