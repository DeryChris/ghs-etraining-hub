"use client";

import Link from "next/link";
import { Eye, EyeOff, LogIn, Mail, Lock } from "lucide-react";
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
    return "This account is not activated yet. Contact your facility administrator.";
  }
  if (lower.includes("too many") || lower.includes("rate limit")) {
    return "Too many attempts. Wait a few minutes, then try again.";
  }
  return "We could not sign you in. Try again in a few minutes. If the problem continues, contact the ICT helpdesk.";
}

export function LoginForm({ next, initialError }: { next: string; initialError: string | null }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const supabase = createClient();
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
    <form onSubmit={onSubmit} className="space-y-6" noValidate={false}>
      {error && (
        <p role="alert" className="rounded-control border border-danger/40 bg-danger/10 px-4 py-3 text-sm leading-relaxed text-danger">
          {error}
        </p>
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
            className={`${inputClass} h-12 pl-10`}
          />
        </div>
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
            className={`${inputClass} h-12 pl-10 pr-12`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-pressed={showPassword}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-1.5 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-control text-ink-muted hover:text-ink"
          >
            {showPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
          </button>
        </div>
      </div>

      <Button type="submit" className="h-12 w-full rounded-[var(--radius-pill)] text-[15px]" disabled={pending} aria-busy={pending}>
        <LogIn className="h-4 w-4" aria-hidden />
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
