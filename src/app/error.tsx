"use effective";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-200">
      <div className="max-w-xl p-6 ghs-panel rounded-2xl border border-slate-800 text-center">
        <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
        <p className="text-slate-400 text-sm mb-6">
          We encountered an unexpected error. Please try again or contact support.
        </p>
        <button
          onClick={() => reset()}
          className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
