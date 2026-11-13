"use client";

import { useState } from "react";
import { createClient } from "@/lib/client/supabase-browser";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="space-y-6 text-center">
        <h1 className="text-2xl font-bold text-ink">Reset Link Sent</h1>
        <p className="text-ink-muted text-sm">
          Check your email for instructions to reset your GHS portal password.
        </p>
        <button
          onClick={() => window.location.replace("/login")}
          className="w-full py-3 rounded-control bg-surface border border-hairline text-ink font-semibold hover:bg-surface-2 transition"
        >
          Return to Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-ink">Reset Password</h1>
        <p className="text-ink-muted text-sm">
          Enter your GHS staff email to receive a password reset link.
        </p>
      </div>

      <div className="space-y-4">
        {error && (
          <div className="rounded-control border border-rose-400/30 bg-rose-400/10 p-4 text-rose-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider">
              GHS Staff Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-surface border border-hairline rounded-control p-3 text-ink focus:outline-none focus:border-primary"
              placeholder="name@ghs.gov.gh"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-control bg-primary text-primary-ink font-semibold hover:bg-emerald-400 disabled:bg-surface-2 transition"
          >
            {loading ? "Sending…" : "Send Reset Link"}
          </button>
        </form>

        <p className="text-center text-xs text-ink-muted">
          Remember your password?{" "}
          <button
            onClick={() => window.location.replace("/login")}
            className="text-primary underline underline-offset-4"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
