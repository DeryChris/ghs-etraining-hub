import { ArrowUpRight, CheckCircle2, LifeBuoy, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { BrandMark } from "@/components/brand/brand-mark";
import { SITE } from "@/lib/site";

/**
 * The left half of the sign-in card: how to get in, in the order it happens.
 *
 * Written as steps rather than prose because the people who read it are on their
 * first visit and have a number to type, and because the same panel has to answer
 * the two questions support actually receives — "my old portal password does not
 * work" and "I never got an account".
 */
export function GettingStarted() {
  return (
    <div className="space-y-6">
      <Link href="/" className="flex items-center gap-3 rounded-control text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)]">
        <span className="flex h-11 w-11 items-center justify-center rounded-control bg-white/12 ring-1 ring-white/25">
          <BrandMark size={26} />
        </span>
        <span className="flex flex-col leading-tight">
          <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/75">Ghana Health Service</span>
          <span className="text-base font-extrabold">{SITE.name}</span>
        </span>
      </Link>

      <div className="space-y-2">
        <h2 className="text-xl font-extrabold tracking-tight">Sign in, or create your account</h2>
        <p className="text-sm leading-relaxed text-white/80">
          One account for the trainings you attend and the material your programme publishes.
        </p>
      </div>

      {/* From `lg` the whole panel is shown; on a phone the form must come
          first, so only the heading and the brand survive. */}
      <div className="hidden space-y-3 lg:block">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--accent)]">Getting started</p>
        <ol className="space-y-2.5 text-sm leading-relaxed text-white/85">
          <li className="flex gap-3">
            <Step n={1} />
            <span>
              Sign in with your <strong className="font-semibold text-white">GHS Staff ID</strong> — the digits on your
              payslip — and your password.
            </span>
          </li>
          <li className="flex gap-3">
            <Step n={2} />
            <span>
              No account yet? Choose <strong className="font-semibold text-white">Create an account</strong> under the
              Sign in button and confirm your number against the staff sheet.
            </span>
          </li>
          <li className="flex gap-3">
            <Step n={3} />
            <span>Your name, region, facility and grade are read from HRIMS — you only choose a password.</span>
          </li>
          <li className="flex gap-3">
            <Step n={4} />
            <span>
              Wrong number, forgotten password or a form that will not open? Use the{" "}
              <Link href="/help/report" className="font-semibold text-white underline underline-offset-4">
                Complaint Hub
              </Link>{" "}
              and keep the answer in writing.
            </span>
          </li>
        </ol>
      </div>

      <div className="hidden rounded-control border border-[var(--accent)]/45 bg-[var(--accent)]/[0.12] p-4 text-[13px] leading-relaxed text-white">
        <p className="font-bold text-[var(--accent)]">Used the old portal?</p>
        <p className="mt-1 text-white/85">
          This is a new system, so an old password will not open it. Create an account with your GHS Staff ID — the
          trainings already recorded against your number are here, waiting.
        </p>
      </div>

      <ul className="hidden gap-2 text-[13px] text-white/80 lg:grid">
        <li className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden />
          Every document versioned, with who uploaded and who reviewed it.
        </li>
        <li className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden />
          Access monitored and recorded, as internal GHS systems are.
        </li>
      </ul>

      <Link
        href="/help"
        className="hidden items-center gap-1.5 text-[13px] font-semibold text-white/85 lg:inline-flex underline-offset-4 hover:text-white hover:underline"
      >
        <LifeBuoy className="h-3.5 w-3.5" aria-hidden />
        Help and support
        <ArrowUpRight className="h-3 w-3" aria-hidden />
      </Link>
    </div>
  );
}

function Step({ n }: { n: number }) {
  return (
    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[11px] font-extrabold text-[var(--accent-ink)]">
      {n}
    </span>
  );
}
