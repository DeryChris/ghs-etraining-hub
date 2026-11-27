import { BookOpen, ClipboardCheck, LogIn, UserPlus } from "lucide-react";

/** A compact left-panel guide: signing in is the normal path; account creation is the alternative. */
export function GettingStarted() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-extrabold tracking-tight">Sign in, or create your account</h2>
        <p className="text-sm leading-relaxed text-white/80">
          Already registered? Sign in. New to the Library? Create an account.
        </p>
      </div>

      {/* Keep the guide to desktop; mobile shows the short welcome above the form. */}
      <div className="hidden space-y-3 lg:block">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--accent)]">Getting started</p>
        <ol className="relative space-y-3 text-sm leading-relaxed text-white/85 before:absolute before:bottom-5 before:left-4 before:top-4 before:w-px before:bg-white/20">
          <li className="relative flex gap-3">
            <Step n={1} />
            <div className="min-w-0 pt-0.5">
              <p className="flex items-center gap-2 font-bold text-white">
                <LogIn className="h-4 w-4 text-[var(--accent)]" aria-hidden />
                Sign in
              </p>
              <p className="mt-0.5 text-white/80">Already have an account? Use your GHS Staff ID and password.</p>
            </div>
          </li>
          <li className="relative flex gap-3">
            <Step n={2} />
            <div className="min-w-0 pt-0.5">
              <p className="flex items-center gap-2 font-bold text-white">
                <UserPlus className="h-4 w-4 text-[var(--accent)]" aria-hidden />
                Create an account
              </p>
              <p className="mt-0.5 text-white/80">New here? Choose the account link below the form.</p>
            </div>
          </li>
          <li className="relative flex gap-3">
            <Step n={3} />
            <div className="min-w-0 pt-0.5">
              <p className="flex items-center gap-2 font-bold text-white">
                <ClipboardCheck className="h-4 w-4 text-[var(--accent)]" aria-hidden />
                Complete registration
              </p>
              <p className="mt-0.5 text-white/80">Verify your staff ID, add contact details and choose a password.</p>
            </div>
          </li>
          <li className="relative flex gap-3">
            <Step n={4} />
            <div className="min-w-0 pt-0.5">
              <p className="flex items-center gap-2 font-bold text-white">
                <BookOpen className="h-4 w-4 text-[var(--accent)]" aria-hidden />
                Find a training
              </p>
              <p className="mt-0.5 text-white/80">
                Browse Programme Areas and Programme Fields, then open a training to find its resources.
              </p>
            </div>
          </li>
        </ol>
      </div>

      <div className="hidden rounded-control border border-[var(--accent)]/45 bg-[var(--accent)]/[0.12] p-4 text-[13px] leading-relaxed text-white">
        <p className="font-bold text-[var(--accent)]">Used the old portal?</p>
        <p className="mt-1 text-white/85">
          This system uses its own staff directory and credentials. If your directory record has no password, use Create
          an account to claim it; information from another portal is not assumed to be here.
        </p>
      </div>
    </div>
  );
}

function Step({ n }: { n: number }) {
  return (
    <span className="relative z-10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-white/80 bg-[var(--accent)] text-[10px] font-extrabold tabular-nums text-[var(--accent-ink)]">
      {String(n).padStart(2, "0")}
    </span>
  );
}
