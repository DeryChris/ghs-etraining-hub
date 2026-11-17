import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BookOpenCheck,
  FileCheck2,
  FlaskConical,
  GraduationCap,
  HeartPulse,
  MessagesSquare,
  Pill,
  ShieldCheck,
  Smartphone,
  Stethoscope,
  Users,
  type LucideIcon,
} from "lucide-react";
import { CertificateSeal, EmptyArt, RegionMap } from "@/components/brand/illustrations";
import { CountUp } from "@/components/marketing/count-up";
import { Faq } from "@/components/marketing/faq";
import { Reveal } from "@/components/marketing/reveal";
import { SectionHeading } from "@/components/marketing/section-heading";
import { buttonClass } from "@/components/ui/button";
import { GHS_REGIONS } from "@/lib/ghs-constants";
import { SITE } from "@/lib/site";
import { listPublicCategories } from "@/lib/server/learning-queries";
import { getPublicStatsCached } from "@/lib/server/public-queries";

export const metadata: Metadata = {
  title: "Clinical learning for every health worker",
  description: SITE.fullName,
};

const FEATURES: { icon: LucideIcon; title: string; body: string; tone: string }[] = [
  {
    icon: ShieldCheck,
    title: "Mandatory protocols come first",
    body: "New and revised protocols are flagged the moment they are published, with priority and the deadline your directorate sets.",
    tone: "bg-primary/10 text-primary",
  },
  {
    icon: BadgeCheck,
    title: "CPD you can prove",
    body: "Each completed material adds points to your transcript. Certificates carry a serial code that anyone can verify.",
    tone: "bg-accent/25 text-accent-ink dark:text-accent",
  },
  {
    icon: FileCheck2,
    title: "Controlled, versioned documents",
    body: "Every version is kept. Opening or downloading a controlled document is recorded, so you always work from the current text.",
    tone: "bg-primary/10 text-primary",
  },
  {
    icon: MessagesSquare,
    title: "Facilitator-led learning",
    body: "Ask a clinical question, get a considered answer from the facilitator for your directorate, and keep the conversation on record.",
    tone: "bg-primary/10 text-primary",
  },
  {
    icon: Smartphone,
    title: "Built for slow connections",
    body: "Pages are light and text-first. Video loads only when you press play, so a phone on a weak network still works.",
    tone: "bg-accent/25 text-accent-ink dark:text-accent",
  },
  {
    icon: Users,
    title: "For every cadre and region",
    body: "Nurses, midwives, medical officers, pharmacists and laboratory staff learn side by side, in the same standard, from any facility.",
    tone: "bg-primary/10 text-primary",
  },
];

const STEPS = [
  { icon: ShieldCheck, title: "Sign in", body: "Use your GHS staff account. Your facility administrator issues it." },
  { icon: BookOpenCheck, title: "Choose your directorate", body: "Find the protocols, videos and practicals for your work." },
  { icon: GraduationCap, title: "Learn and acknowledge", body: "Read the controlled document, watch the demonstration, confirm you understand." },
  { icon: BadgeCheck, title: "Earn and verify CPD", body: "Points post to your transcript. Share the serial code when it is asked for." },
];

const CADRES: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: HeartPulse, title: "Nurses and midwives", body: "Triage, maternal care, infection prevention and every shift protocol." },
  { icon: Stethoscope, title: "Medical officers", body: "Clinical guidelines, outbreak case definitions and referral pathways." },
  { icon: Pill, title: "Pharmacists", body: "Medicines safety, dispensing standards and the national formulary." },
  { icon: FlaskConical, title: "Laboratory staff", body: "Specimen handling, quality control and result reporting." },
  { icon: GraduationCap, title: "Facilitators and managers", body: "Publish, review and moderate content for the directorate you lead." },
];

const FAQ = [
  {
    question: "Who can use GHS-ELN?",
    answer:
      "Current Ghana Health Service staff who have a record in the staff directory. There is no public sign-up. Accounts are issued through your facility or regional administrator.",
  },
  {
    question: "How do I get an account?",
    answer:
      "Ask your facility administrator to add you to the staff directory. The ICT team issues your login, and you choose your own password the first time you sign in.",
  },
  {
    question: "Is my learning record official?",
    answer:
      "Completions, CPD points and certificates are recorded against your staff record. Certificates carry a serial code that the verification page can check.",
  },
  {
    question: "Can I use it on a phone with a weak connection?",
    answer:
      "Yes. Pages are light, video loads only when you press play, and controlled documents open in your browser, so you do not need a special app.",
  },
  {
    question: "What happens to my personal data?",
    answer:
      "Your data is processed under the Data Protection Act, 2012 (Act 843). Privileged actions are written to a tamper-evident audit trail. Read the privacy notice for the full picture.",
  },
  {
    question: "I forgot my password. What now?",
    answer:
      "Choose Forgot password on the sign-in page. The reset link works once and expires after a short time. If it fails, ask your facility ICT officer.",
  },
];

export default async function LandingPage() {
  const [stats, directorates] = await Promise.all([getPublicStatsCached(), listPublicCategories()]);
  const previewDirectorates = directorates.slice(0, 6);

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section aria-labelledby="hero-title" className="hero-glow grid-texture relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl items-center gap-16 px-5 pb-20 pt-14 sm:px-8 sm:pt-20 lg:grid-cols-12 lg:gap-10 lg:px-10 lg:pb-28 lg:pt-24">
          <div className="space-y-8 lg:col-span-6">
            <Reveal>
              <p className="inline-flex items-center gap-2.5 rounded-[var(--radius-pill)] border border-hairline bg-surface/80 px-3.5 py-1.5 text-xs font-semibold text-ink-muted backdrop-blur">
                <span className="relative flex h-2 w-2" aria-hidden>
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                </span>
                Ghana Health Service · Continuing professional development
              </p>
            </Reveal>

            <Reveal delay={0.06}>
              <h1 id="hero-title" className="text-balance text-[2.75rem] font-extrabold leading-[1.02] tracking-tight text-ink sm:text-6xl lg:text-[4.1rem]">
                Clinical learning that keeps{" "}
                <span className="text-gradient-brand">every health worker</span> current.
              </h1>
            </Reveal>

            <Reveal delay={0.12}>
              <p className="max-w-xl text-lg leading-relaxed text-ink-muted">
                Protocols, practical training and verifiable CPD for GHS staff in every facility, from Accra to Nalerigu. Learn at
                your own pace, acknowledge what is mandatory, and carry a record of your competence.
              </p>
            </Reveal>

            <Reveal delay={0.18}>
              <div className="flex flex-wrap items-center gap-3">
                <Link href="/login" className={buttonClass({ size: "md", className: "h-12 rounded-[var(--radius-pill)] px-6 text-[15px] shadow-lift" })}>
                  Sign in to learn
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <Link
                  href="/programmes"
                  className={buttonClass({ variant: "secondary", className: "h-12 rounded-[var(--radius-pill)] px-6 text-[15px]" })}
                >
                  Explore programmes
                </Link>
              </div>
            </Reveal>

            {stats && (
            <Reveal delay={0.24}>
              <dl className="grid max-w-md grid-cols-3 gap-6 border-t border-hairline pt-7">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Directorates</dt>
                  <dd className="mt-1 text-3xl font-extrabold text-ink">
                    <CountUp value={stats.directorates} />
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Spaces</dt>
                  <dd className="mt-1 text-3xl font-extrabold text-ink">
                    <CountUp value={stats.spaces} />
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Materials</dt>
                  <dd className="mt-1 text-3xl font-extrabold text-ink">
                    <CountUp value={stats.materials} />
                  </dd>
                </div>
              </dl>
            </Reveal>
            )}
          </div>

          <div className="relative lg:col-span-6">
            <Reveal delay={0.1}>
              <div className="relative mx-auto max-w-[34rem]">
                <div className="absolute -inset-6 -z-10 rounded-[3rem] bg-primary/15 blur-3xl" aria-hidden />
                <div className="relative aspect-[4/4.4] overflow-hidden rounded-hero border border-hairline shadow-lift sm:aspect-[5/4.2]">
                  <Image
                    src="/images/stock/health-workers.jpg"
                    alt="Health workers in scrubs standing together in a hospital corridor"
                    fill
                    priority
                    sizes="(min-width: 1024px) 540px, 100vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-canvas/70 via-transparent to-transparent" aria-hidden />
                </div>

                {/* Product cards: illustrative, decorative, and never the only source of information. */}
                <div aria-hidden className="glass drift absolute -left-4 top-10 hidden w-56 rounded-card border border-hairline p-4 shadow-lift sm:block">
                  <div className="flex items-center gap-3">
                    <CertificateSeal className="h-11 w-11 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">CPD record</p>
                      <p className="text-sm font-bold text-ink">Points verified on completion</p>
                    </div>
                  </div>
                </div>
                <div aria-hidden className="glass absolute -bottom-6 right-4 w-64 rounded-card border border-hairline p-4 shadow-lift sm:right-0" style={{ animation: "drift 8s ease-in-out -2s infinite" }}>
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-ink">
                      <BadgeCheck className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-ink">Protocol acknowledged</p>
                      <p className="text-xs leading-relaxed text-ink-muted">Version-controlled SOP. Your acknowledgement is on record.</p>
                    </div>
                  </div>
                </div>
                <div aria-hidden className="glass absolute -top-5 right-6 hidden items-center gap-2 rounded-[var(--radius-pill)] border border-hairline px-3.5 py-2 shadow-panel sm:flex">
                  <span className="h-2 w-2 rounded-full bg-warn" />
                  <span className="text-xs font-semibold text-ink">Mandatory protocol due</span>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Directorate strip (live taxonomy) ────────────────────────────── */}
      {previewDirectorates.length > 0 && (
        <section aria-label="Directorates on the platform" className="border-y border-hairline bg-surface/60">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-8 gap-y-3 px-5 py-6 sm:px-8 lg:px-10">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">Programmes include</p>
            <ul className="flex flex-wrap gap-2">
              {previewDirectorates.map((item) => (
                <li key={item.id} className="rounded-[var(--radius-pill)] border border-hairline bg-canvas px-3 py-1 text-xs font-semibold text-ink">
                  {item.name}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section aria-labelledby="features-title" className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:px-10 lg:py-32">
        <Reveal>
          <SectionHeading
            eyebrow="Why GHS-ELN"
            title={<span id="features-title">Everything a clinical team needs to stay current, in one place.</span> as unknown as string}
            description="We built it around the work: the protocol you need before a shift, the proof you need at appraisal, and the conversation you need with a facilitator."
          />
        </Reveal>
        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Reveal key={feature.title} delay={(index % 3) * 0.06}>
                <article className="group h-full rounded-card border border-hairline bg-surface p-7 shadow-panel transition-[transform,box-shadow,border-color] duration-base ease-out-quint hover:-translate-y-1 hover:border-primary/40 hover:shadow-lift">
                  <span className={`inline-flex h-12 w-12 items-center justify-center rounded-[1rem] ${feature.tone}`}>
                    <Icon className="h-6 w-6" aria-hidden />
                  </span>
                  <h3 className="mt-6 text-lg font-bold text-ink">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">{feature.body}</p>
                </article>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section aria-labelledby="how-title" className="bg-surface/60 py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <Reveal>
            <SectionHeading eyebrow="How it works" title={<span id="how-title">From sign-in to a verified record in four steps.</span> as unknown as string} />
          </Reveal>
          <ol className="relative mt-16 grid gap-10 md:grid-cols-4 md:gap-6">
            <div aria-hidden className="absolute left-7 top-7 hidden h-px w-[calc(100%-3.5rem)] bg-gradient-to-r from-primary via-primary/40 to-accent md:block" />
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <Reveal key={step.title} delay={index * 0.08}>
                  <li className="relative list-none space-y-5">
                    <span className="relative flex h-14 w-14 items-center justify-center rounded-full border border-hairline bg-canvas shadow-panel">
                      <Icon className="h-6 w-6 text-primary" aria-hidden />
                      <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs font-extrabold text-accent-ink">
                        {index + 1}
                      </span>
                    </span>
                    <div>
                      <h3 className="text-lg font-bold text-ink">{step.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-ink-muted">{step.body}</p>
                    </div>
                  </li>
                </Reveal>
              );
            })}
          </ol>
        </div>
      </section>

      {/* ── Regions ──────────────────────────────────────────────────────── */}
      <section aria-labelledby="regions-title" className="mx-auto grid max-w-7xl items-center gap-14 px-5 py-24 sm:px-8 lg:grid-cols-2 lg:gap-20 lg:px-10 lg:py-32">
        <Reveal>
          <div className="relative overflow-hidden rounded-hero border border-hairline bg-surface p-8 shadow-panel sm:p-10">
            <div className="grid-texture absolute inset-0 opacity-70" aria-hidden />
            <RegionMap className="relative mx-auto h-auto w-full max-w-[21rem]" />
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          <div className="space-y-6">
            <SectionHeading
              eyebrow="Across Ghana"
              title={<span id="regions-title">Present in all {SITE.regionCount} regions.</span> as unknown as string}
              description="The same protocols and the same CPD standard reach a district hospital in the north and a teaching hospital in Accra. Nobody learns from an older version because of where they serve."
            />
            <ul className="flex flex-wrap gap-2">
              {GHS_REGIONS.map((region) => (
                <li key={region} className="rounded-[var(--radius-pill)] border border-hairline bg-surface px-3 py-1.5 text-xs font-semibold text-ink-muted">
                  {region}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </section>

      {/* ── Directorates ─────────────────────────────────────────────────── */}
      <section aria-labelledby="programmes-title" className="bg-surface/60 py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <Reveal>
              <SectionHeading eyebrow="Programmes" title={<span id="programmes-title">Built by the directorates that own the standards.</span> as unknown as string} />
            </Reveal>
            <Reveal delay={0.1}>
              <Link href="/programmes" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:underline underline-offset-4">
                All programmes
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </Reveal>
          </div>

          {previewDirectorates.length === 0 ? (
            <div className="mt-14 flex flex-col items-center gap-4 rounded-card border border-dashed border-hairline bg-canvas p-12 text-center">
              <EmptyArt variant="folder" className="h-28 w-auto text-ink-muted" />
              <p className="text-sm text-ink-muted">Programmes will appear here as directorates publish them.</p>
            </div>
          ) : (
            <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {previewDirectorates.map((item, index) => (
                <Reveal key={item.id} delay={(index % 3) * 0.06}>
                  <li className="list-none">
                    <Link
                      href="/programmes"
                      className="group flex h-full flex-col gap-4 rounded-card border border-hairline bg-canvas p-6 transition-[transform,border-color] duration-base ease-out-quint hover:-translate-y-1 hover:border-primary/40"
                    >
                      <span className="w-fit rounded-md bg-surface-2 px-2 py-1 font-mono text-[11px] font-semibold tracking-wide text-ink-muted">{item.code}</span>
                      <h3 className="text-lg font-bold leading-snug text-ink">{item.name}</h3>
                      {item.description && <p className="line-clamp-2 text-sm leading-relaxed text-ink-muted">{item.description}</p>}
                      <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-sm font-semibold text-primary">
                        {item.spaceCount} {item.spaceCount === 1 ? "space" : "spaces"}
                        <ArrowRight className="h-4 w-4 transition-transform duration-base group-hover:translate-x-1" aria-hidden />
                      </span>
                    </Link>
                  </li>
                </Reveal>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ── Cadres ───────────────────────────────────────────────────────── */}
      <section aria-labelledby="cadres-title" className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:px-10 lg:py-32">
        <Reveal>
          <SectionHeading eyebrow="For every role" title={<span id="cadres-title">Learning that fits the work you actually do.</span> as unknown as string} />
        </Reveal>
        <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {CADRES.map((cadre, index) => {
            const Icon = cadre.icon;
            return (
              <Reveal key={cadre.title} delay={index * 0.05}>
                <li className="h-full list-none rounded-card border border-hairline bg-surface p-6 transition-colors duration-base hover:border-primary/40">
                  <Icon className="h-7 w-7 text-primary" aria-hidden />
                  <h3 className="mt-5 text-base font-bold text-ink">{cadre.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">{cadre.body}</p>
                </li>
              </Reveal>
            );
          })}
        </ul>
      </section>

      {/* ── Photo band ───────────────────────────────────────────────────── */}
      <section aria-labelledby="band-title" className="px-5 sm:px-8 lg:px-10">
        <Reveal>
          <div className="relative mx-auto max-w-7xl overflow-hidden rounded-hero border border-hairline shadow-lift">
            <Image
              src="/images/stock/nurses-clipboard.jpg"
              alt="Two nurses in blue scrubs reviewing a clinical document together"
              width={1200}
              height={627}
              sizes="(min-width: 1280px) 1200px, 100vw"
              className="h-[24rem] w-full object-cover sm:h-[28rem]"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-canvas/95 via-canvas/70 to-canvas/10" aria-hidden />
            <div className="absolute inset-0 flex items-center p-8 sm:p-14">
              <div className="max-w-lg space-y-5">
                <h2 id="band-title" className="text-3xl font-extrabold leading-tight text-ink sm:text-4xl">
                  Every shift starts with the right protocol. Make sure yours is current.
                </h2>
                <p className="text-base leading-relaxed text-ink-muted">
                  Mandatory protocols are flagged the moment they are published. Acknowledge them once, and the record is kept.
                </p>
                <Link href="/login" className={buttonClass({ className: "h-12 rounded-[var(--radius-pill)] px-6" })}>
                  Review your mandatory protocols
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section aria-labelledby="faq-title" className="mx-auto grid max-w-7xl gap-14 px-5 py-24 sm:px-8 lg:grid-cols-[1fr_1.4fr] lg:gap-20 lg:px-10 lg:py-32">
        <Reveal>
          <div className="space-y-5">
            <SectionHeading eyebrow="Questions" title={<span id="faq-title">Answers before you sign in.</span> as unknown as string} />
            <p className="text-sm text-ink-muted">
              Still stuck? Read the <Link href="/contact" className="font-semibold text-primary underline-offset-4 hover:underline">contact page</Link>{" "}
              for who to ask.
            </p>
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          <Faq items={FAQ.map((item) => ({ question: item.question, answer: item.answer }))} />
        </Reveal>
      </section>

      {/* ── Closing call to action ───────────────────────────────────────── */}
      <section aria-labelledby="cta-title" className="px-5 pb-24 sm:px-8 lg:px-10">
        <Reveal>
          <div className="relative mx-auto max-w-7xl overflow-hidden rounded-hero bg-primary px-8 py-14 text-primary-ink sm:px-14 sm:py-20">
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/30 blur-3xl" aria-hidden />
            <div className="absolute -bottom-32 left-1/3 h-80 w-80 rounded-full bg-[#cf2027]/30 blur-3xl" aria-hidden />
            <div className="relative grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:items-center">
              <div className="space-y-4">
                <h2 id="cta-title" className="text-3xl font-extrabold leading-tight sm:text-4xl">
                  Start with the protocol you need this week.
                </h2>
                <p className="max-w-xl text-base leading-relaxed text-primary-ink/85">
                  Sign in with your GHS staff account. If you do not have one yet, your facility administrator can add you in minutes.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                <Link href="/login" className="inline-flex h-12 items-center justify-center gap-2 rounded-[var(--radius-pill)] bg-accent px-6 text-[15px] font-bold text-accent-ink transition-transform duration-fast hover:-translate-y-0.5">
                  Sign in
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <Link href="/contact" className="inline-flex h-12 items-center justify-center rounded-[var(--radius-pill)] border border-primary-ink/30 px-6 text-[15px] font-semibold text-primary-ink transition-colors hover:bg-primary-ink/10">
                  Need an account?
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
