"use client";

import { useState } from "react";
import { createClient } from "@/lib/client/supabase-browser";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const supabase = createClient();

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

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
      <div className="max-w-sm mx-auto space-y-8">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-600 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Reset Link Sent</h1>
          <p className="text-slate-400 text-sm">
            Check your email for instructions to reset your GHS portal password.
          </p>
        </div>
        <div className="glass-panel p-6 rounded-2xl border border-slate-800">
          <button
            onClick={() => window.location.replace("/login")}
            className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
          >
            Return to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Reset Password</h1>
        <p className="text-slate-400 text-sm">
          Enter your GHS staff email to receive a password reset link.
        </p>
      </div>

      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-5">
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleReset} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
              GHS Staff Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition"
              placeholder="name@ghs.gov.gh"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:bg-emerald-900 text-white font-bold text-xs uppercase tracking-wider shadow transition"
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500">
          Remember your password? <a href="/login" className="text-emerald-400 hover:underline">Sign in</a>
        </p>
      </div>
    </div>
  );
}
