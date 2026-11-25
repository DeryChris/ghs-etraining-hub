"use client";

import Link from "next/link";
import { Eye, EyeOff, Loader2, LogIn, Mail, Lock } from "lucide-react";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { inputClass, labelClass } from "@/components/ui/input";
import { signInAction, type SignInState } from "@/lib/server/actions/auth";

/**
 * Sign-in posts to a server action that compares the password against
 * `public.users.password_hash` and sets our own signed session cookie. Nothing
 * about the credentials leaves the server, and there is no third-party auth SDK
 * in the browser any more.
 *
 * `useActionState` gives the form its pending state and the error message the
 * action returns, so the visitor's email survives a failed attempt.
 */
export function LoginForm({ next, initialError }: { next: string; initialError: string | null }) {
  const [state, formAction, pending] = useActionState<SignInState, FormData>(signInAction, {
    error: initialError,
  });
  const [showPassword, setShowPassword] = useState(false);

  const error = state.error;
  const credentialsProblem = error?.startsWith("The email or password is not correct") ?? false;

  return (
    <form action={formAction} className="space-y-5" noValidate={false}>
      <input type="hidden" name="next" value={next} />

      {error && (
        <div role="alert" className="rounded-control border border-danger/40 bg-danger/10 px-4 py-3 text-sm leading-relaxed text-danger">
          <p>{error}</p>
          {credentialsProblem && (
            <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
              <Link href="/forgot-password" className="font-semibold underline underline-offset-4">
                Reset your password
              </Link>
              <Link href="/help/report" className="font-semibold underline underline-offset-4">
                Lodge a complaint
              </Link>
            </p>
          )}
        </div>
      )}

      <div>
        <label htmlFor="email" className={labelClass}>
          Email
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden />
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            defaultValue={state.email ?? ""}
            placeholder="name@ghs.gov.gh"
            aria-describedby="email-hint"
            className={`${inputClass} h-12 pl-10`}
          />
        </div>
        <p id="email-hint" className="mt-1.5 text-xs text-ink-muted">
          The address you registered with — not your Staff ID.
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="password" className={labelClass}>
            Password
          </label>
          <Link href="/forgot-password" className="-mt-1.5 text-xs font-semibold text-primary underline-offset-4 hover:underline">
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden />
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            className={`${inputClass} h-12 pl-10 pr-20`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-pressed={showPassword}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-1.5 top-1/2 inline-flex h-9 -translate-y-1/2 items-center gap-1 rounded-control px-2.5 text-xs font-semibold text-ink-muted hover:bg-surface-2 hover:text-ink"
          >
            {showPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      <div className="flex items-start gap-2.5">
        <input
          id="remember"
          name="remember"
          type="checkbox"
          className="mt-0.5 h-4 w-4 rounded border-hairline text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        />
        <label htmlFor="remember" className="text-sm leading-snug text-ink">
          Remember me
          <span className="mt-0.5 block text-xs text-ink-muted">Stay signed in for 30 days. Leave this off on a shared computer.</span>
        </label>
      </div>

      <Button
        type="submit"
        className="h-12 w-full rounded-[var(--radius-pill)] text-[15px]"
        disabled={pending}
        aria-busy={pending}
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <LogIn className="h-4 w-4" aria-hidden />}
        {pending ? "Signing you in…" : "Sign in"}
      </Button>
    </form>
  );
}
