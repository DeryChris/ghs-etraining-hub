"use client";

import Link from "next/link";
import { Loader2, KeyRound } from "lucide-react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { inputClass, labelClass } from "@/components/ui/input";
import { completePasswordResetAction, type PasswordResetState } from "@/lib/server/actions/password";

const MIN_PASSWORD_LENGTH = 10;

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState<PasswordResetState, FormData>(completePasswordResetAction, {
    error: null,
  });

  if (state.done) {
    return (
      <div className="surface-card space-y-4 p-7 text-center sm:p-8">
        <p className="text-sm leading-relaxed text-ink">
          Your password has been changed. Sign in with the new one — the reset link no longer works.
        </p>
        <Link
          href="/login"
          className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-pill)] bg-primary px-6 text-sm font-semibold text-white"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="surface-card space-y-6 p-7 sm:p-8">
      <input type="hidden" name="token" value={token} />

      {state.error && (
        <p role="alert" className="rounded-control border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {state.error}
        </p>
      )}

      <div>
        <label htmlFor="new-password" className={labelClass}>
          New password
        </label>
        <input
          id="new-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          className={`${inputClass} h-12`}
        />
        <p className="mt-1.5 text-xs text-ink-muted">At least {MIN_PASSWORD_LENGTH} characters.</p>
      </div>

      <div>
        <label htmlFor="confirm-password" className={labelClass}>
          Confirm new password
        </label>
        <input
          id="confirm-password"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          className={`${inputClass} h-12`}
        />
      </div>

      <Button type="submit" className="h-12 w-full rounded-[var(--radius-pill)]" disabled={pending} aria-busy={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <KeyRound className="h-4 w-4" aria-hidden />}
        {pending ? "Saving…" : "Save new password"}
      </Button>
    </form>
  );
}
