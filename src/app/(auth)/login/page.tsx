"use client";

import { useState } from "react";
import { signIn } from "@/lib/client/supabase-browser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error: err } = await signIn({ email, password });

    setLoading(false);
    if (err) {
      setError(err);
      return;
    }

    window.location.replace("/dashboard");
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-ink">GHS-ELN</h1>
        <p className="text-ink-muted text-sm">
          Ghana Health Service eLearning Network — Staff Sign In
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

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-surface border border-hairline rounded-control p-3 text-ink focus:outline-none focus:border-primary"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-control bg-primary text-primary-ink font-semibold hover:bg-emerald-400 disabled:bg-surface-2 transition"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p className="text-center text-xs text-ink-muted">
          Need access? Contact your regional secretariat to be invited.
        </p>
      </div>
    </div>
  );
}
