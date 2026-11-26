import Link from "next/link";
import type { ReactNode } from "react";
import { Check, LifeBuoy } from "lucide-react";
import { AuthArt } from "@/components/brand/auth-art";
import { BrandMark } from "@/components/brand/brand-mark";
import { SITE } from "@/lib/site";

/**
 * Split screen: the green Getting-started panel on the left, the form beside it.
 *
 * The left panel is not decoration. A first-time visitor arriving at a sign-in
 * page usually does not know whether they have an account at all, which email to
 * use, or who to ask when the password does not work — so the panel answers those
 * three questions before the form asks for anything (docs/ui-ux.md §5).
 */

const STEPS: { title: string; body: string }[] = [
  {
    title: "Sign in with your Staff ID",
    body: "Your employee number, the one on your payslip — 112755, for example. It is already in the staff directory, so there is nothing to register.",
  },
  {
    title: "Use the password you were given",
    body: "ICT issues a first password for every account and hands it to you directly. It is yours alone; nobody at GHS will ask you for it.",
  },
  {
    title: "Choose your own straight away",
    body: "The first sign-in asks for a new password and nothing else opens until you have set one. After that, only you know it.",
  },
  {
    title: "Your record follows you",
    body: "Trainings you attend, certificates you earn and material you finish stay attached to your employee number — wherever you are posted next.",
  },
];

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.02fr_1fr]">
      <aside className="nav-surface relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between">
        <AuthArt />
        <div className="flag-stripe absolute inset-x-0 top-0 z-10 h-1.5" aria-hidden />

        <div className="relative flex h-full flex-col gap-10 p-12 text-white xl:p-16">
          <Link
            href="/"
            className="inline-flex w-fit items-center gap-3 rounded-control focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          >
            <BrandMark size={46} />
            <span className="flex flex-col leading-none">
              <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/70">Ghana Health Service</span>
              <span className="mt-1.5 text-lg font-extrabold tracking-tight">{SITE.name}</span>
            </span>
          </Link>

          <div className="max-w-lg space-y-6">
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#ffe9a8]">Getting started</p>
              <h2 className="text-2xl font-extrabold leading-tight xl:text-3xl">New here? Four steps and you are in.</h2>
            </div>

            <ol className="space-y-4">
              {STEPS.map((step, index) => (
                <li key={step.title} className="flex gap-3.5">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/30 text-xs font-extrabold text-white">
                    {index + 1}
                  </span>
                  <span className="block">
                    <span className="block text-sm font-bold text-white">{step.title}</span>
                    <span className="mt-0.5 block text-[13px] leading-relaxed text-white/70">{step.body}</span>
                  </span>
                </li>
              ))}
            </ol>

            <div className="rounded-card border border-white/25 bg-white/10 p-4 backdrop-blur-[2px]">
              <p className="text-sm font-bold text-[#ffe9a8]">Used an older portal before?</p>
              <p className="mt-1 text-[13px] leading-relaxed text-white/75">
                Your record may already exist. Try signing in with the email you used then; if it does not work, do
                not create a second account — lodge a complaint and your access will be reset for you.
              </p>
            </div>

            <ul className="space-y-2">
              {["No paper forms, no queueing at HR.", "Your complaint, and its answer, stay on record."].map((line) => (
                <li key={line} className="flex items-start gap-2 text-[13px] text-white/75">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
                  {line}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[var(--nav-muted)]">
            <span className="inline-flex items-center gap-1.5">
              <LifeBuoy className="h-3.5 w-3.5" aria-hidden />
              Internal platform. Access is monitored and recorded.
            </span>
          </div>
        </div>
      </aside>

      <div className="flex flex-col justify-center bg-canvas px-6 py-12 sm:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-[26rem] space-y-7">
          <div className="flex items-center justify-between lg:hidden">
            <Link href="/" className="inline-flex items-center gap-3" aria-label={`${SITE.name} home`}>
              <BrandMark size={40} />
              <span className="flex flex-col leading-none">
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-muted">Ghana Health Service</span>
                <span className="mt-1 text-sm font-extrabold tracking-tight text-ink">{SITE.name}</span>
              </span>
            </Link>
          </div>

          {children}

          <details className="rounded-card border border-hairline bg-surface/70 p-4 lg:hidden">
            <summary className="cursor-pointer text-sm font-bold text-ink">First time here? Read this</summary>
            <ol className="mt-3 space-y-2.5">
              {STEPS.map((step, index) => (
                <li key={step.title} className="flex gap-2.5 text-[13px] leading-relaxed text-ink-muted">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[11px] font-extrabold text-ink">
                    {index + 1}
                  </span>
                  <span>
                    <span className="font-semibold text-ink">{step.title}.</span> {step.body}
                  </span>
                </li>
              ))}
            </ol>
          </details>

          <p className="text-center text-xs text-ink-muted">
            <Link href="/" className="font-semibold text-ink-muted underline-offset-4 hover:text-ink hover:underline">
              Back to the {SITE.name} home page
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
