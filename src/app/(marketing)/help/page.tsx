import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ClipboardList, CircleHelp, KeyRound, Library, MessageSquareWarning, Search, ShieldCheck } from "lucide-react";
import { Reveal } from "@/components/marketing/reveal";
import { SectionHeading } from "@/components/marketing/section-heading";
import { Faq } from "@/components/marketing/faq";
import { buttonClass } from "@/components/ui/button";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Help Centre",
  description: `Guidance for using the ${SITE.name} — signing in, finding training materials, versions and account assistance.`,
};

const GETTING_STARTED = [
  {
    question: "What is the Training Library?",
    answer: `The ${SITE.fullName} organises training materials associated with programmes in the ${SITE.regionName}. You can browse visible Programme Areas and Programme Fields publicly; a material appears there only after it has been submitted, approved and published.`,
  },
  {
    question: "How do I sign in or set up an account?",
    answer:
      "Sign in with your GHS Staff ID and password. If you have an active, unclaimed record in the staff directory, choose Create an account to verify your ID and set a password. The form cannot add a staff record; report a missing or incorrect record through the Complaint Hub.",
  },
  {
    question: "How do I navigate Programme Areas?",
    answer:
      "Open Programme Areas from the main menu. Each card is a Programme Area — the parent level. Open one to see the Programme Fields inside it, then open a Programme Field to reach its Training Materials. Breadcrumbs on every page show where you are.",
  },
  {
    question: "How do I find a training or its materials?",
    answer:
      "Browse Programme Areas to a Programme Field to see the trainings recorded for it. After signing in, the Trainings list searches every record by title and filters by area, field, year, place and status; the slides, attendance sheet and report for a training are attached to that training.",
  },
];

const USING_THE_LIBRARY = [
  {
    question: "How do I preview or download a resource?",
    answer:
      "Sign in, open the material from its Programme Field, and use the viewer. Preview opens in the browser where the format allows it; download gives you the file. Both actions are recorded against the version you opened.",
  },
  {
    question: "What do the approval statuses mean?",
    answer:
      "A version is shown as current only after it has passed review and been published. Draft and in-review versions are not current; superseded and archived versions are marked separately in the history.",
  },
  {
    question: "Can I still open an older version?",
    answer:
      "After signing in, authorised users can view superseded versions in the history. They are clearly marked, while the current published version is identified separately.",
  },
  {
    question: "Understanding document versions",
    answer:
      "Each upload becomes a numbered version. A version becomes current only when it passes review and is published; its version history shows previous versions and their upload and review details.",
  },
];

const ACCOUNT_HELP = [
  {
    question: "I forgot my password. What now?",
    answer:
      "There is no automated password-reset email. Ask your facility administrator or ICT helpdesk to issue a one-time reset link; it expires after an hour. If you cannot reach them, report the access problem through the Complaint Hub.",
  },
  {
    question: "My account is locked or I cannot see material.",
    answer:
      "If sign-in fails or your assigned Programme Areas are missing, report the issue through the Complaint Hub below. Include the error you see; do not share your password.",
  },
  {
    question: "Reporting a problem",
    answer:
      "Something is not working, a document will not open, or a directory detail is wrong? Lodge a report through the Complaint Hub. The reference number lets you check its status later.",
  },
];

const COMPLAINT_CARDS = [
  {
    href: "/help/report",
    icon: MessageSquareWarning,
    title: "Report an issue",
    body: "Report a sign-in problem, a directory correction or a material that will not open. You will receive a reference to check its status.",
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

function HelpGroup({
  id,
  icon,
  title,
  items,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  items: { question: string; answer: string }[];
}) {
  return (
    <div className="space-y-5">
      <h2 id={id} className="flex items-center gap-2.5 text-xl font-extrabold tracking-tight text-ink">
        <span className="flex h-9 w-9 items-center justify-center rounded-control bg-mint text-primary">{icon}</span>
        {title}
      </h2>
      <Faq items={items} />
    </div>
  );
}

export default function HelpPage() {
  return (
    <>
      <section className="hero-glow relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-5 pb-12 pt-10 sm:px-8 sm:pt-16 lg:px-10">
          <Reveal className="max-w-3xl space-y-6">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              <CircleHelp className="h-4 w-4" aria-hidden />
              Help Centre
            </p>
            <h1 className="text-balance text-4xl font-extrabold leading-[1.05] tracking-tight text-ink sm:text-5xl">
              How can we help you use the Library?
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-ink-muted">
              Getting started, finding materials, understanding versions and sorting out account problems — start with the
              questions below, or go straight to the Complaint Hub if something is not working.
            </p>
          </Reveal>
        </div>
      </section>

      <section aria-label="Help topics" className="mx-auto max-w-7xl space-y-14 px-5 pb-20 sm:px-8 lg:px-10">
        <Reveal>
          <HelpGroup id="getting-started" icon={<ClipboardList className="h-5 w-5" aria-hidden />} title="Getting started" items={GETTING_STARTED} />
        </Reveal>
        <Reveal>
          <HelpGroup id="using-the-library" icon={<Library className="h-5 w-5" aria-hidden />} title="Using the Library" items={USING_THE_LIBRARY} />
        </Reveal>
        <Reveal>
          <HelpGroup id="account-help" icon={<KeyRound className="h-5 w-5" aria-hidden />} title="Account and access" items={ACCOUNT_HELP} />
        </Reveal>
      </section>

      {/* Complaint Hub — preserved exactly as it works today. */}
      <section aria-labelledby="complaint-hub" className="bg-surface/60 py-16">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <Reveal>
            <SectionHeading
              eyebrow="Complaint Hub"
              title={<span id="complaint-hub">Something not working? Report it here.</span> as unknown as string}
              description="Submit an issue without signing in, receive a reference and use the status page to check for an update."
            />
          </Reveal>
          <ul className="mt-10 grid gap-5 md:grid-cols-2">
            {COMPLAINT_CARDS.map((card, index) => {
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

          <div className="mt-8 grid gap-8 lg:grid-cols-3">
            <Reveal className="lg:col-span-2 space-y-4 rounded-card border border-hairline bg-surface p-7">
              <h2 className="flex items-center gap-2 text-lg font-bold text-ink">
                <ShieldCheck className="h-5 w-5 text-primary" aria-hidden />
                What happens after you lodge one
              </h2>
              <ol className="space-y-3 text-sm leading-relaxed text-ink-muted">
                <li>
                  <span className="font-semibold text-ink">1. You get a reference.</span> Quote it on the phone, and use
                  your Staff ID to check the status at any time.
                </li>
                <li>
                  <span className="font-semibold text-ink">2. Its status can change.</span> An administrator may review it,
                  add an answer or assist with account access. Processing time varies; use your Staff ID to check for updates.
                </li>
                <li>
                  <span className="font-semibold text-ink">3. Any saved answer stays on record.</span> Check the status page
                  with your Staff ID to read the response, or add a message if you still need help.
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
        </div>
      </section>
    </>
  );
}
