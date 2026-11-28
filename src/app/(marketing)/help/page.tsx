import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ClipboardList,
  ClipboardCheck,
  Headset,
  MessageCircle,
  MessageSquareWarning,
  ShieldCheck,
  TicketCheck,
} from "lucide-react";
import { HelpCentre } from "@/components/help/help-centre";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Help Centre",
  description: `Get help with account access, Programme Areas, trainings and attached files in the ${SITE.name}.`,
};

const COMPLAINT_STEPS = [
  {
    number: "01",
    title: "Receive your reference",
    description:
      "After submitting a complaint, the form shows a reference number. Keep it for follow-up or when contacting support.",
    icon: TicketCheck,
    tone: "bg-ghs-red/10 text-ghs-red",
  },
  {
    number: "02",
    title: "Your issue is reviewed",
    description:
      "An administrator or a district HR officer may review the report, update its status, answer you or help with account access. Processing time varies.",
    icon: ClipboardList,
    tone: "bg-ghs-green/10 text-ghs-green",
  },
  {
    number: "03",
    title: "Check for a response",
    description:
      "Use your Staff ID on the status page to see updates and read a response. You can add a follow-up message where available.",
    icon: MessageCircle,
    tone: "bg-ghs-gold/35 text-ghs-green",
  },
] as const;

function ComplaintHubHero() {
  return (
    <section aria-labelledby="complaint-hub-title" className="px-4 pt-4 sm:px-6 sm:pt-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="flag-stripe h-1.5 rounded-t-[var(--radius-hero)]" aria-hidden="true" />
        <div className="relative isolate overflow-hidden rounded-b-[var(--radius-hero)] bg-ghs-green text-white shadow-lift">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full border-[2rem] border-white/[0.06]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 right-24 h-52 w-52 rounded-full border-[1.5rem] border-ghs-red/20"
          />

          <div className="relative space-y-8 p-5 sm:p-8 lg:p-10">
            <div className="max-w-3xl">
              <p className="inline-flex items-center gap-2 rounded-full bg-ghs-red px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.16em] text-white">
                <MessageSquareWarning className="h-4 w-4" aria-hidden />
                Complaint Hub
              </p>
              <h1
                id="complaint-hub-title"
                className="mt-5 text-balance text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl"
              >
                Need help? We&apos;re here to help.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/90 sm:text-lg">
                Having trouble accessing your account, finding a training or opening a file attached to it? Report the
                problem through the Complaint Hub and follow its progress.
              </p>
              <p className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-control border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-bold text-white sm:text-base">
                <ShieldCheck className="h-5 w-5 shrink-0 text-ghs-gold" aria-hidden />
                You can report an issue without signing in.
              </p>
            </div>

            <ul className="grid gap-4 lg:grid-cols-2">
              <li>
                <Link
                  href="/help/report"
                  className="group flex h-full min-h-60 flex-col rounded-card border border-white/80 bg-white p-5 text-[#202522] shadow-panel transition-[transform,box-shadow] duration-fast motion-safe:hover:-translate-y-0.5 hover:shadow-lift motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:p-6"
                >
                  <span className="flex items-start gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-control bg-ghs-red text-white">
                      <MessageSquareWarning className="h-6 w-6" aria-hidden />
                    </span>
                    <span>
                      <span className="block text-xl font-extrabold">Lodge a Complaint</span>
                      <span className="mt-1 block text-sm leading-relaxed text-[#526057]">
                        Report a sign-in problem, incorrect staff-directory details, a training issue or a file that will
                        not open.
                      </span>
                    </span>
                  </span>
                  <span className="mt-auto inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--radius-pill)] bg-ghs-red px-5 text-sm font-extrabold text-white transition-[filter,transform] group-hover:brightness-95 motion-safe:group-hover:translate-x-0.5 motion-reduce:transition-none sm:text-base">
                    Report an Issue
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </span>
                </Link>
              </li>

              <li>
                <Link
                  href="/help/status"
                  className="group flex h-full min-h-60 flex-col rounded-card border border-white/80 bg-white p-5 text-[#202522] shadow-panel transition-[transform,box-shadow] duration-fast motion-safe:hover:-translate-y-0.5 hover:shadow-lift motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:p-6"
                >
                  <span className="flex items-start gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-control bg-ghs-gold text-ghs-green">
                      <ClipboardCheck className="h-6 w-6" aria-hidden />
                    </span>
                    <span>
                      <span className="block text-xl font-extrabold">Check Complaint Status</span>
                      <span className="mt-1 block text-sm leading-relaxed text-[#526057]">
                        See whether your complaint is being handled, read any response and send a follow-up where
                        available.
                      </span>
                    </span>
                  </span>
                  <span className="mt-3 text-xs leading-relaxed text-[#526057]">
                    Use the same Staff ID you submitted with your complaint.
                  </span>
                  <span className="mt-auto inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--radius-pill)] bg-ghs-gold px-5 text-sm font-extrabold text-[#202522] transition-[filter,transform] group-hover:brightness-95 motion-safe:group-hover:translate-x-0.5 motion-reduce:transition-none sm:text-base">
                    Check Status
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </span>
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function ComplaintProcess() {
  return (
    <section aria-labelledby="complaint-process-title" className="mx-auto max-w-7xl px-5 pt-8 sm:px-8 lg:px-10">
      <div className="rounded-card border border-hairline bg-surface p-5 shadow-panel sm:p-7">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-ghs-red">What happens next</p>
            <h2 id="complaint-process-title" className="mt-1 text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
              After you report an issue
            </h2>
          </div>
          <Link
            href="/help/status"
            className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Check a complaint
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>

        <ol className="grid gap-5 md:grid-cols-3">
          {COMPLAINT_STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <li key={step.number} className="flex gap-3">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-control ${step.tone}`}>
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-ink-muted">{step.number}</p>
                  <h3 className="mt-0.5 font-bold text-ink">{step.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-muted">{step.description}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

function AdditionalSupport() {
  return (
    <section aria-labelledby="additional-support-title" className="mx-auto max-w-7xl px-5 pb-16 pt-2 sm:px-8 lg:px-10">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
        <div className="flex flex-col items-start gap-4 rounded-card border border-hairline bg-surface p-5 shadow-panel sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-ghs-red">Additional support</p>
            <h2 id="additional-support-title" className="mt-1 text-xl font-extrabold tracking-tight text-ink">
              Need another way to get help?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              If you cannot use the Complaint Hub, your facility ICT officer can contact the helpdesk on your behalf.
              Provide your complaint reference if you already have one.
            </p>
          </div>
          <Link
            href="/contact"
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-[var(--radius-pill)] bg-primary px-5 text-sm font-bold text-primary-ink transition-colors hover:bg-primary/90 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <Headset className="h-4 w-4" aria-hidden />
            Contact and Support
          </Link>
        </div>

        <div className="flex items-start gap-3 rounded-card border border-hairline bg-surface-2/60 p-5 sm:p-6">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-ghs-gold/35 text-ghs-green">
            <ShieldCheck className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h2 className="text-base font-bold text-ink">Privacy Notice</h2>
            <p className="mt-1 text-sm leading-relaxed text-ink-muted">
              Complaints involving personal data are handled under the Privacy Notice, which explains what information is
              retained and for how long.
            </p>
            <Link
              href="/privacy"
              className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Read the Privacy Notice
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function HelpPage() {
  return (
    <>
      <ComplaintHubHero />
      <ComplaintProcess />
      <HelpCentre />
      <AdditionalSupport />
    </>
  );
}
