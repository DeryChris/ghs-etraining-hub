"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas p-4">
      <div className="max-w-md space-y-6 text-center">
        <h1 className="text-2xl font-bold text-ink">Something went wrong</h1>
        <p className="text-ink-muted text-sm">
          We encountered an unexpected error. Please try again or contact support.
        </p>
        <button
          onClick={() => reset()}
          className="w-full py-3 rounded-control bg-primary text-primary-ink font-semibold hover:bg-emerald-400 transition"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
