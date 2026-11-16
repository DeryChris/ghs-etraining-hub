import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpenCheck, Eye, HeartHandshake, Lock, ShieldCheck, Target, Users } from "lucide-react";
import { RegionMap } from "@/components/brand/illustrations";
import { Reveal } from "@/components/marketing/reveal";
import { SectionHeading } from "@/components/marketing/section-heading";
import { buttonClass } from "@/components/ui/button";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description: "Why GHS-ELN exists, how it is governed and what comes next.",
};

const VALUES = [
  { icon: ShieldCheck, title: "Safety first", body: "Protocols are the most useful thing we publish. They have to be correct, current and easy to find." },
  { icon: HeartHandshake, title: "Equity across regions", body: "A nurse in Nalerigu gets the same standard, the same speed of update and the same CPD as one in Accra." },
  { icon: Eye, title: "Accountable by design", body: "Every privileged action is recorded in a tamper-evident audit trail. Nobody, including administrators, edits history quietly." },
  { icon: Lock, title: "Privacy by default", body: "We collect what the work needs. We do not handle patient information here, and personal data is protected under Act 843." },
];

const ROLES = [
  {
    icon: Users,
    name: "Learners",
    who: "Ghana Health Service staff",
    body: "Learn, acknowledge mandatory protocols, complete materials, earn CPD and talk to facilitators.",
  },
  {
    icon: BookOpenCheck,
    name: "Facilitators",
    who: "Directorate subject experts",
    body: "Publish and version content for the directorates they are assigned to, and moderate discussion there.",
  },
  {
    icon: ShieldCheck,
    name: "System administrators",
    who: "ICT and directorate leads",
    body: "Manage the staff directory, the taxonomy and platform notices, and review the audit trail.",
  },
];

const ROADMAP = [
  {
    phase: "Live now",
    status: "done" as const,
    items: ["Mandatory protocols and acknowledgement", "CPD transcript and verifiable certificates", "Library, directorates and spaces", "Staff messaging and notices", "Audit-logged administration"],
  },
  {
    phase: "Next",
    status: "next" as const,
    items: ["Signed, expiring access to controlled files", "Assessments with scoring and retakes", "Guided practical labs", "Facilitator authoring tools"],
  },
  {
    phase: "Later",
    status: "later" as const,
    items: ["Learning that works offline on low-bandwidth phones", "Twi and other Ghanaian languages", "Directory sync with GHS HR records"],
  },
];

const PHOTO_CREDITS = [
  "Health team photograph by RDNE Stock Project, Pexels",
  "Doctor portrait by Tessy Agbonome, Pexels",
  "Nurses reviewing documents by RDNE Stock Project, Pexels",
];

export default function AboutPage() {
  return (
    <>
      <section aria-labelledby="about-title" className="hero-glow relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 pb-20 pt-16 sm:px-8 sm:pt-24 lg:grid-cols-12 lg:gap-12 lg:px-10">
          <Reveal className="space-y-7 lg:col-span-7">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">About GHS-ELN</p>
            <h1 id="about-title" className="text-balance text-4xl font-extrabold leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-6xl">
              Current knowledge should never depend on which district you serve.
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-ink-muted">
              GHS-ELN is the Ghana Health Service eTraining Network. It brings clinical protocols, practical training and continuing
              professional development into one governed platform for every GHS staff member.
            </p>
          </Reveal>
          <Reveal delay={0.1} className="lg:col-span-5">
            <div className="relative aspect-[4/3] overflow-hidden rounded-hero border border-hairline shadow-lift">
              <Image
                src="/images/stock/doctor-portrait.jpg"
                alt="A smiling doctor in a white coat with a stethoscope"
                fill
                sizes="(min-width: 1024px) 480px, 100vw"
                className="object-cover"
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* Mission and vision */}
      <section aria-labelledby="mission-title" className="mx-auto grid max-w-7xl gap-6 px-5 py-20 sm:px-8 md:grid-cols-2 lg:px-10">
        <Reveal>
          <article className="h-full rounded-card border border-hairline bg-surface p-8 shadow-panel sm:p-10">
            <Target className="h-7 w-7 text-primary" aria-hidden />
            <h2 id="mission-title" className="mt-6 text-2xl font-extrabold text-ink">Our mission</h2>
            <p className="mt-4 text-base leading-relaxed text-ink-muted">
              Give every health worker in Ghana the same access to current clinical protocols and to professional development that can be
              proven, wherever they serve.
            </p>
          </article>
        </Reveal>
        <Reveal delay={0.08}>
          <article className="h-full rounded-card border border-hairline bg-primary p-8 text-primary-ink shadow-panel sm:p-10">
            <Eye className="h-7 w-7 text-accent" aria-hidden />
            <h2 className="mt-6 text-2xl font-extrabold">Our vision</h2>
            <p className="mt-4 text-base leading-relaxed text-primary-ink/85">
              A health system where what a clinician knows today is what the protocol says today, and where that knowledge is recognised
              wherever they practise.
            </p>
          </article>
        </Reveal>
      </section>

      {/* Values */}
      <section aria-labelledby="values-title" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
        <Reveal>
          <SectionHeading eyebrow="Our values" title={<span id="values-title">What we hold ourselves to.</span> as unknown as string} />
        </Reveal>
        <div className="mt-14 grid gap-5 sm:grid-cols-2">
          {VALUES.map((value, index) => {
            const Icon = value.icon;
            return (
              <Reveal key={value.title} delay={index * 0.06}>
                <article className="flex h-full gap-5 rounded-card border border-hairline bg-surface p-7 shadow-panel">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1rem] bg-primary/10 text-primary">
                    <Icon className="h-6 w-6" aria-hidden />
                  </span>
                  <div>
                    <h3 className="text-lg font-bold text-ink">{value.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink-muted">{value.body}</p>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* Governance */}
      <section aria-labelledby="governance-title" className="bg-surface/60 py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <Reveal>
            <SectionHeading
              eyebrow="How it is governed"
              title={<span id="governance-title">Three roles, each with clear limits.</span> as unknown as string}
              description="Access follows the job. Staff directory records decide what each person can do, and every change to that authority is itself recorded."
            />
          </Reveal>
          <ul className="mt-14 grid gap-5 md:grid-cols-3">
            {ROLES.map((role, index) => {
              const Icon = role.icon;
              return (
                <Reveal key={role.name} delay={index * 0.07}>
                  <li className="h-full list-none rounded-card border border-hairline bg-canvas p-7">
                    <Icon className="h-7 w-7 text-primary" aria-hidden />
                    <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-ink-muted">{role.who}</p>
                    <h3 className="mt-1 text-xl font-bold text-ink">{role.name}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-ink-muted">{role.body}</p>
                  </li>
                </Reveal>
              );
            })}
          </ul>
        </div>
      </section>

      {/* Reach */}
      <section aria-labelledby="reach-title" className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:px-10 lg:py-28">
        <Reveal>
          <div className="relative overflow-hidden rounded-hero border border-hairline bg-surface p-8 shadow-panel">
            <div className="grid-texture absolute inset-0 opacity-70" aria-hidden />
            <RegionMap className="relative mx-auto h-auto w-full max-w-[18rem]" />
          </div>
        </Reveal>
        <Reveal delay={0.08} className="space-y-5">
          <SectionHeading eyebrow="Reach" title={<span id="reach-title">Serving {SITE.regionCount} regions and every cadre.</span> as unknown as string} />
          <p className="text-base leading-relaxed text-ink-muted">
            Pages are designed for mobile networks, video loads only on request, and controlled documents open straight in the browser. The
            platform is meant to reach the district hospital and the health centre, not only the teaching hospital.
          </p>
        </Reveal>
      </section>

      {/* Roadmap */}
      <section aria-labelledby="roadmap-title" className="bg-surface/60 py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <Reveal>
            <SectionHeading eyebrow="Roadmap" title={<span id="roadmap-title">What is live, what is next.</span> as unknown as string} />
          </Reveal>
          <ol className="mt-14 grid gap-5 lg:grid-cols-3">
            {ROADMAP.map((stage, index) => (
              <Reveal key={stage.phase} delay={index * 0.08}>
                <li className="h-full list-none rounded-card border border-hairline bg-canvas p-7">
                  <span
                    className={`inline-flex items-center gap-2 rounded-[var(--radius-pill)] px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                      stage.status === "done" ? "bg-primary text-primary-ink" : stage.status === "next" ? "bg-accent text-accent-ink" : "bg-surface-2 text-ink-muted"
                    }`}
                  >
                    {stage.phase}
                  </span>
                  <ul className="mt-6 space-y-3">
                    {stage.items.map((item) => (
                      <li key={item} className="flex gap-3 text-sm leading-relaxed text-ink">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                        {item}
                      </li>
                    ))}
                  </ul>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* Closing */}
      <section aria-labelledby="about-cta" className="mx-auto max-w-7xl px-5 py-24 text-center sm:px-8 lg:px-10">
        <Reveal className="mx-auto max-w-2xl space-y-6">
          <h2 id="about-cta" className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            Ready to see what is current?
          </h2>
          <p className="text-base leading-relaxed text-ink-muted">Sign in with your GHS staff account, or ask your facility administrator to add you.</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/login" className={buttonClass({ className: "h-12 rounded-[var(--radius-pill)] px-6" })}>
              Sign in
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link href="/programmes" className={buttonClass({ variant: "secondary", className: "h-12 rounded-[var(--radius-pill)] px-6" })}>
              View programmes
            </Link>
          </div>
        </Reveal>
      </section>

      <footer className="mx-auto max-w-7xl px-5 pb-10 text-xs leading-relaxed text-ink-muted sm:px-8 lg:px-10">
        <p className="font-semibold text-ink">Photography</p>
        <ul className="mt-2 space-y-1">
          {PHOTO_CREDITS.map((credit) => (
            <li key={credit}>{credit}</li>
          ))}
        </ul>
      </footer>
    </>
  );
}
