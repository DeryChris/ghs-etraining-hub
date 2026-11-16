"use client";

import Link from "next/link";
import { MailCheck, Mail } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { inputClass, labelClass } from "@/components/ui/input";
import { createClient } from "@/lib/client/supabase-browser";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const supabase = createClient();
    // The link goes through the auth callback, which exchanges the code and then lands on /reset-password.
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent("/reset-password")}`;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });

    setPending(false);
    if (resetError) {
      setError("We could not send the reset link. Try again in a few minutes.");
      return;
    }
    // Same message whether or not the account exists, so this form cannot be used to probe staff emails.
    setSent(true);
  }

  if (sent) {
    return (
      <div className="space-y-6 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/12 text-primary">
          <MailCheck className="h-7 w-7" aria-hidden />
        </span>
        <div className="space-y-3">
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">Check your email</h1>
          <p className="text-sm leading-relaxed text-ink-muted">
            If a staff account exists for that address, a reset link is on its way. The link works once and expires after a short time.
          </p>
        </div>
        <Link href="/login" className="inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Account</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Reset your password</h1>
        <p className="text-sm leading-relaxed text-ink-muted">Enter your GHS staff email. We will send a link to choose a new password.</p>
      </div>

      <form onSubmit={onSubmit} className="surface-card space-y-6 p-7 sm:p-8">
        {error && (
          <p role="alert" className="rounded-control border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </p>
        )}
        <div>
          <label htmlFor="reset-email" className={labelClass}>
            GHS staff email
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden />
            <input
              id="reset-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@ghs.gov.gh"
              className={`${inputClass} h-12 pl-10`}
            />
          </div>
        </div>
        <Button type="submit" className="h-12 w-full rounded-[var(--radius-pill)]" disabled={pending} aria-busy={pending}>
          {pending ? "Sending link…" : "Send reset link"}
        </Button>
      </form>

      <p className="text-center text-sm">
        <Link href="/login" className="font-semibold text-primary underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      </p>
    </>
  );
}
