import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ClipboardList, MessageSquareWarning, Search, ShieldCheck } from "lucide-react";
import { Reveal } from "@/components/marketing/reveal";
import { buttonClass } from "@/components/ui/button";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Complaint Hub",
  description: "Report a problem with your account, your course or your details — and follow it until it is resolved.",
};

const CARDS = [
  {
    href: "/help/report",
    icon: MessageSquareWarning,
    title: "Report an issue",
    body: "Your password does not work, your name is spelled wrong, a material will not open. Write it once here and it reaches the person who can fix it.",
    action: "Lodge a complaint",
  },
  {
    href: "/help/status",
    icon: Search,
    title: "Check my complaint status",
    body: "Enter the Staff ID you lodged it under to see whether it is being handled and read the answer that was given.",
    action: "Check status",
  },
] as const;

export default function HelpPage() {
  return (
    <>
      <section className="hero-glow relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-5 pb-12 pt-16 sm:px-8 sm:pt-24 lg:px-10">
          <Reveal className="max-w-3xl space-y-6">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              <ClipboardList className="h-4 w-4" aria-hidden />
              Complaint Hub
            </p>
            <h1 className="text-balance text-4xl font-extrabold leading-[1.05] tracking-tight text-ink sm:text-5xl">
              Something not working? Say so here — it gets answered.
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-ink-muted">
              Every complaint is written down, answered by a named person and kept on record, so nothing depends on
              remembering a phone call. You do not need to be signed in: if you cannot get into your account, this is
              exactly where to start.
            </p>
          </Reveal>
        </div>
      </section>

      <section aria-label="Complaint Hub" className="mx-auto max-w-7xl px-5 pb-16 sm:px-8 lg:px-10">
        <ul className="grid gap-5 md:grid-cols-2">
          {CARDS.map((card, index) => {
            const Icon = card.icon;
            return (
              <Reveal key={card.href} delay={index * 0.06}>
                <li className="list-none">
                  <Link
                    href={card.href}
                    className="group flex h-full flex-col gap-4 rounded-card border border-hairline bg-surface p-7 shadow-panel transition-[transform,border-color] duration-base ease-out-quint hover:-translate-y-1 hover:border-primary/40"
                  >
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Icon className="h-6 w-6" aria-hidden />
                    </span>
                    <span className="text-xl font-bold text-ink">{card.title}</span>
                    <span className="text-sm leading-relaxed text-ink-muted">{card.body}</span>
                    <span className="mt-auto inline-flex items-center gap-1.5 pt-3 text-sm font-semibold text-primary">
                      {card.action}
                      <ArrowRight className="h-4 w-4 transition-transform duration-base group-hover:translate-x-1" aria-hidden />
                    </span>
                  </Link>
                </li>
              </Reveal>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="help-next" className="bg-surface/60 py-16">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 sm:px-8 lg:grid-cols-3 lg:px-10">
          <Reveal className="lg:col-span-2 space-y-4 rounded-card border border-hairline bg-surface p-7">
            <h2 id="help-next" className="flex items-center gap-2 text-lg font-bold text-ink">
              <ShieldCheck className="h-5 w-5 text-primary" aria-hidden />
              What happens after you lodge one
            </h2>
            <ol className="space-y-3 text-sm leading-relaxed text-ink-muted">
              <li>
                <span className="font-semibold text-ink">1. You get a reference.</span> Quote it on the phone, and use
                your Staff ID to check the status at any time.
              </li>
              <li>
                <span className="font-semibold text-ink">2. Somebody is named against it.</span> An administrator either
                answers it or, for access problems, resets your details and tells you the new ones.
              </li>
              <li>
                <span className="font-semibold text-ink">3. The answer stays on record.</span> When it is closed you can
                still read what was done, and why.
              </li>
            </ol>
          </Reveal>
          <Reveal delay={0.06} className="space-y-4 rounded-card border border-hairline bg-canvas p-7">
            <h2 className="text-lg font-bold text-ink">Cannot use the form?</h2>
            <p className="text-sm leading-relaxed text-ink-muted">
              Your facility ICT officer can reach the helpdesk directly. Give them the reference if you already have one.
            </p>
            <Link href="/contact" className={buttonClass({ variant: "secondary", className: "w-full" })}>
              Other ways to reach {SITE.code}
            </Link>
            <p className="text-xs text-ink-muted">
              Complaints about personal data are handled under the privacy notice, which explains what we keep and for
              how long.
            </p>
          </Reveal>
        </div>
      </section>
    </>
  );
}
