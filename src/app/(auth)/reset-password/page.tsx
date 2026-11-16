"use client";

import { KeyRound } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { inputClass, labelClass } from "@/components/ui/input";
import { createClient } from "@/lib/client/supabase-browser";

const MIN_PASSWORD_LENGTH = 10;

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Use at least ${MIN_PASSWORD_LENGTH} characters for your new password.`);
      return;
    }
    if (password !== confirm) {
      setError("The two passwords do not match. Check both and try again.");
      return;
    }

    setPending(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setPending(false);
      setError("We could not update your password. Request a new reset link and try again.");
      return;
    }
    window.location.replace("/dashboard?notice=password-updated");
  }

  return (
    <>
      <div className="space-y-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/12 text-primary">
          <KeyRound className="h-6 w-6" aria-hidden />
        </span>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Choose a new password</h1>
        <p className="text-sm leading-relaxed text-ink-muted">
          Use at least {MIN_PASSWORD_LENGTH} characters. A short phrase you can remember works well.
        </p>
      </div>

      <form onSubmit={onSubmit} className="surface-card space-y-6 p-7 sm:p-8">
        {error && (
          <p role="alert" className="rounded-control border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
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
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={`${inputClass} h-12`}
          />
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
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            className={`${inputClass} h-12`}
          />
        </div>
        <Button type="submit" className="h-12 w-full rounded-[var(--radius-pill)]" disabled={pending} aria-busy={pending}>
          {pending ? "Updating password…" : "Update password"}
        </Button>
      </form>
    </>
  );
}
