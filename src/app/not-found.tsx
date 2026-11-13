import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas p-4">
      <div className="max-w-md space-y-6 text-center">
        <h1 className="text-2xl font-bold text-ink">Page not found</h1>
        <p className="text-ink-muted text-sm">
          The requested resource could not be found on GHS-ELN.
        </p>
        <Link
          href="/dashboard"
          className="w-full py-3 rounded-control bg-primary text-primary-ink font-semibold hover:bg-emerald-400 transition block"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
