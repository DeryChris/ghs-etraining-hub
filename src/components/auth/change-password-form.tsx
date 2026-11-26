"use client";

import Link from "next/link";
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { inputClass, labelClass } from "@/components/ui/input";
import { changePasswordAction, type ChangePasswordState } from "@/lib/server/actions/password";

/**
 * Choosing your own password.
 *
 * Shown on first sign-in (the password came from ICT, not from the person using
 * it) and reachable afterwards from Settings. The strength rule is stated up
 * front rather than as a rejection: ten characters, and different from the one
 * being replaced.
 */
export function ChangePasswordForm({ firstTime = false }: { firstTime?: boolean }) {
  const [state, formAction, pending] = useActionState<ChangePasswordState, FormData>(changePasswordAction, {
    error: null,
  });
  const [show, setShow] = useState(false);

  if (state.done) {
    return (
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-card border border-success/40 bg-success/10 p-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden />
          <div>
            <p className="text-sm font-bold text-ink">That is your password now</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-muted">
              Nobody else knows it, including ICT. Keep it to yourself — you will not be asked for it by phone or
              e-mail.
            </p>
          </div>
        </div>
        <Link href="/dashboard" className={buttonClassName}>
          Continue to your dashboard
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      {state.error && (
        <div role="alert" className="rounded-control border border-danger/40 bg-danger/10 px-4 py-3 text-sm leading-relaxed text-danger">
          {state.error}
        </div>
      )}

      {firstTime && (
        <div className="rounded-control border border-info/35 bg-info/8 px-4 py-3 text-sm leading-relaxed text-ink">
          You signed in with the password you were given. Choose your own now — it is the only way into your account
          from here on.
        </div>
      )}

      <div>
        <label htmlFor="current" className={labelClass}>
          Password you signed in with
        </label>
        <div className="relative">
          <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden />
          <input
            id="current"
            name="current"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            required
            className={`${inputClass} h-12 pl-10`}
          />
        </div>
      </div>

      <div>
        <label htmlFor="password" className={labelClass}>
          New password
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={show ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={10}
            aria-describedby="password-hint"
            className={`${inputClass} h-12 pr-20`}
          />
          <button
            type="button"
            onClick={() => setShow((value) => !value)}
            aria-pressed={show}
            aria-label={show ? "Hide passwords" : "Show passwords"}
            className="absolute right-1.5 top-1/2 inline-flex h-9 -translate-y-1/2 items-center gap-1 rounded-control px-2.5 text-xs font-semibold text-ink-muted hover:bg-surface-2 hover:text-ink"
          >
            {show ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
            {show ? "Hide" : "Show"}
          </button>
        </div>
        <p id="password-hint" className="mt-1.5 text-xs text-ink-muted">
          At least 10 characters. A phrase you will remember beats a short scramble.
        </p>
      </div>

      <div>
        <label htmlFor="confirm" className={labelClass}>
          New password again
        </label>
        <input
          id="confirm"
          name="confirm"
          type={show ? "text" : "password"}
          autoComplete="new-password"
          required
          minLength={10}
          className={`${inputClass} h-12`}
        />
      </div>

      <Button type="submit" className="h-12 w-full rounded-[var(--radius-pill)] text-[15px]" disabled={pending} aria-busy={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <KeyRound className="h-4 w-4" aria-hidden />}
        {pending ? "Saving…" : "Save my new password"}
      </Button>
    </form>
  );
}

const buttonClassName =
  "inline-flex h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-pill)] bg-primary px-6 text-[15px] font-semibold text-primary-ink transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
