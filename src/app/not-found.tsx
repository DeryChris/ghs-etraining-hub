import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-200">
      <div className="max-w-xl p-6 ghs-panel rounded-2xl border border-slate-800 text-center">
        <h1 className="text-2xl font-bold text-white mb-2">Page not found</h1>
        <p className="text-slate-400 text-sm mb-6">
          The requested resource could not be found on the GHS eTraining Hub.
        </p>
        <Link
          href="/login"
          className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold inline-block"
        >
          Return to Login
        </Link>
      </div>
    </div>
  );
}
