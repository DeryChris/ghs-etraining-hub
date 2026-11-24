"use client";

import Link from "next/link";
import { Eye, EyeOff, Loader2, LogIn, Mail, Lock } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { inputClass, labelClass } from "@/components/ui/input";
import { createClient } from "@/lib/client/supabase-browser";

/** Turns provider messages into plain-English guidance (docs/ui-ux.md §5). */
function friendlyError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) {
    return "The email or password is not correct. Check your details and try again.";
  }
  if (lower.includes("email not confirmed")) {
    return "This account is not activated yet. Lodge a complaint and access will be sorted for you.";
  }
  if (lower.includes("too many") || lower.includes("rate limit")) {
    return "Too many attempts. Wait a few minutes, then try again.";
  }
  return "We could not sign you in. Try again in a few minutes. If the problem continues, lodge a complaint through the Complaint Hub.";
}

/** 30 days, in seconds. Only used when "Remember me" is ticked. */
const REMEMBER_MAX_AGE = 60 * 60 * 24 * 30;

export function LoginForm({ next, initialError }: { next: string; initialError: string | null }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const [pending, setPending] = useState(false);

  const credentialsProblem = error?.startsWith("The email or password is not correct") ?? false;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    // Ticking "Remember me" writes persistent cookies; leaving it clear keeps the
    // session cookie, so signing out of a shared computer is a closed tab away.
    const supabase = createClient(
      remember ? { cookieOptions: { path: "/", maxAge: REMEMBER_MAX_AGE, sameSite: "lax" } } : undefined,
    );
    const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (authError) {
      setPending(false);
      setError(friendlyError(authError.message));
      return;
    }
    // Full navigation so the server layout reads the fresh session cookie.
    window.location.replace(next);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate={false}>
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
            value={email}
            onChange={(event) => setEmail(event.target.value)}
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
            value={password}
            onChange={(event) => setPassword(event.target.value)}
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
          checked={remember}
          onChange={(event) => setRemember(event.target.checked)}
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
