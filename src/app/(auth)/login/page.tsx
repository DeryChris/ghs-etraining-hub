"use client";

import { useState } from "react";
import { createClient } from "@/lib/client/supabase-browser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error: err } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }

    window.location.replace("/dashboard");
  }

  return (
    <div className="max-w-sm mx-auto space-y-8">
      <div className="text-center">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600 via-teal-700 to-amber-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-900/40">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 2v20M2 12h20M12 6l4 4-4 4-4-4 4-4z" />
          </svg>
        </div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">GHS eTraining Hub</h1>
        <p className="text-slate-400 text-sm">
          Ghana Health Service - Continuous Professional Development
        </p>
      </div>

      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-5">
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition placeholder-slate-500"
              placeholder="name@ghs.gov.gh"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:bg-emerald-900 text-white font-bold text-xs uppercase tracking-wider shadow transition"
          >
            {loading ? "Signing in..." : "Sign In to GHS Portal"}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500">
          Having trouble? <a href="/forgot-password" className="text-emerald-400 hover:underline">Reset password</a>
        </p>
      </div>

      <div className="text-center text-[10px] text-slate-500 uppercase tracking-wider">
        GHANA HEALTH SERVICE • HUMAN RESOURCES DIRECTORATE
      </div>
    </div>
  );
}
