import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  FolderOpen,
  FileCheck2,
  FolderKanban,
  History,
  FlaskConical,
  HeartPulse,
  Pill,
  Search,
  ShieldCheck,
  Smartphone,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";
import { EmptyArt, HealthMark, RegionMap } from "@/components/brand/illustrations";
import { CtaArt, HeroArt, MapArt } from "@/components/marketing/landing-art";
import { CountUp } from "@/components/marketing/count-up";
import { Faq } from "@/components/marketing/faq";
import { Reveal } from "@/components/marketing/reveal";
import { ProgrammeFieldTile } from "@/components/programme/programme-tile";
import { SectionHeading } from "@/components/marketing/section-heading";
import { buttonClass } from "@/components/ui/button";
import { SITE } from "@/lib/site";
import { GHS_REGIONS, LIVE_REGION } from "@/lib/ghs-constants";
import { listPublicFields } from "@/lib/server/learning-queries";
import { getPublicStatsCached } from "@/lib/server/public-queries";

export const metadata: Metadata = {
  title: "Training material for every GHS programme",
  description: SITE.description,
};

const FEATURES: { icon: LucideIcon; title: string; body: string; tone: string }[] = [
  {
    icon: FolderKanban,
    title: "One home for every programme",
    body: "Each directorate and unit that runs training gets its own place: the material, the date it last changed and who to ask about it.",
    tone: "bg-primary/10 text-primary",
  },
  {
    icon: History,
    title: "Every version kept",
    body: "A new file never overwrites the old one. The version you were trained on stays readable and clearly marked once it is replaced.",
    tone: "bg-accent/25 text-accent-ink dark:text-accent",
  },
  {
    icon: ShieldCheck,
    title: "Reviewed before it goes live",
    body: "A colleague who did not upload the file has to approve it first, so one person cannot publish clinical content on their own.",
    tone: "bg-primary/10 text-primary",
  },
  {
    icon: FileCheck2,
    title: "Nothing disappears quietly",
    body: "Uploads, edits, approvals, downloads and withdrawals are written to a tamper-evident audit trail. Material is archived, never silently deleted.",
    tone: "bg-primary/10 text-primary",
  },
  {
    icon: Search,
    title: "Find it by programme, area or title",
    body: "Search the whole catalogue, open the current version, or check what was in force when a session ran.",
    tone: "bg-accent/25 text-accent-ink dark:text-accent",
  },
  {
    icon: Smartphone,
    title: "Light enough for a weak connection",
    body: "Pages are text-first and video loads only when you press play, so a phone on a slow network still opens the document you need.",
    tone: "bg-primary/10 text-primary",
  },
];

const STEPS = [
  {
    icon: ShieldCheck,
    title: "Sign in",
    body: "Use your GHS staff account. Your facility administrator issues it — there is no public sign-up.",
  },
  {
    icon: FolderOpen,
    title: "Open the programme",
    body: "Find the programme field and the area that ran the training you attended.",
  },
  {
    icon: FileCheck2,
    title: "Read or download the material",
    body: "Take the current version, or the copy that was in force when you were trained. Both stay available.",
  },
  {
    icon: BadgeCheck,
    title: "Find your way back",
    body: "The library keeps what you opened and downloaded, so you can return to the same version.",
  },
];

const CADRES: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: HeartPulse, title: "Nurses and midwives", body: "Ward protocols, maternal care and IPC material from the sessions you attended." },
  { icon: Stethoscope, title: "Medical officers", body: "Clinical guidelines and case definitions, with the version that was current at the time." },
  { icon: Pill, title: "Pharmacists", body: "Medicines safety, dispensing standards and the national formulary as taught." },
  { icon: FlaskConical, title: "Laboratory staff", body: "Specimen handling, quality control and result reporting, by programme." },
  { icon: Stethoscope, title: "Facilitators and managers", body: "Upload, version, review and archive the material for the programmes you run." },
];

const FAQ = [
  {
    question: `What is the ${SITE.name}?`,
    answer: `It is the ${SITE.fullName} — ${SITE.purpose} Material from a session is filed under the programme that ran it, with the date and the version, so a facilitator's slides are still findable a year later.`,
  },
  {
    question: "Who can use it?",
    answer:
      "Current Ghana Health Service staff with a record in the staff directory. There is no public sign-up; accounts are issued through your facility or regional administrator.",
  },
  {
    question: "What happens to the material we used to share on WhatsApp?",
    answer:
      "It is filed here instead — under the programme that ran the session, with the date and the version. A group chat can still carry the conversation, but the document of record lives in the library where it cannot be scrolled away.",
  },
  {
    question: "Can I still open an older version?",
    answer:
      "Yes. Superseded versions stay readable and are clearly marked, so you can see exactly what was in force when you were trained or assessed.",
  },
  {
    question: "Who can upload or remove material?",
    answer:
      "Facilitators assigned to the directorate upload and version it. Nothing is deleted: material is archived, and the audit trail keeps who uploaded, reviewed, published, downloaded or withdrew it.",
  },
  {
    question: "What does the library keep about me?",
    answer:
      "Which material you opened and downloaded, always against the version you saw. The record exists so programme teams can see what is being read and what is being missed."
  },
  {
    question: "I forgot my password. What now?",
    answer:
      "Choose Forgot password on the sign-in page. The reset link works once and expires after a short time. If it fails, ask your facility ICT officer.",
  },
];

export default async function LandingPage() {
  const [stats, fields] = await Promise.all([getPublicStatsCached(), listPublicFields()]);
  const previewFields = fields.slice(0, 6);

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section aria-labelledby="hero-title" className="relative overflow-hidden">
        <HeroArt />
        <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-5 pb-20 pt-14 sm:px-8 sm:pt-20 lg:grid-cols-12 lg:gap-10 lg:px-10 lg:pb-28 lg:pt-24">
          <div className="space-y-8 lg:col-span-6">
            <Reveal>
              <p className="inline-flex items-center gap-2.5 rounded-[var(--radius-pill)] border border-hairline bg-surface/80 px-3.5 py-1.5 text-xs font-semibold text-ink-muted backdrop-blur">
                <span className="relative flex h-2 w-2" aria-hidden>
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                </span>
                Ghana Health Service · Training programme materials
              </p>
            </Reveal>

            <Reveal delay={0.06}>
              <h1 id="hero-title" className="text-balance text-[2.75rem] font-extrabold leading-[1.02] tracking-tight text-ink sm:text-6xl lg:text-[4.1rem]">
                The material from every GHS training,{" "}
                <span className="text-gradient-brand">kept and versioned</span>.
              </h1>
            </Reveal>

            <Reveal delay={0.12}>
              <p className="max-w-xl text-lg leading-relaxed text-ink-muted">
                After a session, slides and protocols used to go into a WhatsApp group and sink under the next morning&apos;s
                messages. Here they are filed under the programme that ran it — with the version, the date and the people who
                uploaded, reviewed and used it.
              </p>
            </Reveal>

            <Reveal delay={0.18}>
              <div className="flex flex-wrap items-center gap-3">
                <Link href="/login" className={buttonClass({ size: "md", className: "h-12 rounded-[var(--radius-pill)] px-6 text-[15px] shadow-lift" })}>
                  Sign in
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <Link
                  href="/programmes"
                  className={buttonClass({ variant: "secondary", className: "h-12 rounded-[var(--radius-pill)] px-6 text-[15px]" })}
                >
                  Browse programmes
                </Link>
              </div>
            </Reveal>

            {stats && (
            <Reveal delay={0.24}>
              <dl className="grid max-w-md grid-cols-3 gap-6 border-t border-hairline pt-7">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Programmes</dt>
                  <dd className="mt-1 text-3xl font-extrabold text-ink">
                    <CountUp value={stats.fields} />
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Programme areas</dt>
                  <dd className="mt-1 text-3xl font-extrabold text-ink">
                    <CountUp value={stats.areas} />
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
                <div
                  aria-hidden
                  className="absolute -inset-4 -z-10 rounded-[2.5rem] opacity-70"
                  style={{
                    background:
                      "linear-gradient(135deg, color-mix(in oklab, var(--primary) 24%, transparent), transparent 52%, color-mix(in oklab, var(--accent) 20%, transparent))",
                  }}
                />
                <div className="relative aspect-[4/3] overflow-hidden rounded-hero border border-hairline shadow-lift sm:aspect-[16/11]">
                  <Image
                    src="/images/stock/health-workers.jpg"
                    alt="Four Ghanaian health workers — a nurse, a midwife, a doctor and a laboratory scientist — standing together in a hospital corridor"
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
                    <HealthMark className="h-11 w-11 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Version history</p>
                      <p className="text-sm font-bold text-ink">Every revision kept</p>
                    </div>
                  </div>
                </div>
                <div aria-hidden className="glass absolute -bottom-6 right-4 w-64 rounded-card border border-hairline p-4 shadow-lift sm:right-0" style={{ animation: "drift 8s ease-in-out -2s infinite" }}>
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-ink">
                      <BadgeCheck className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-ink">Reviewed before publishing</p>
                      <p className="text-xs leading-relaxed text-ink-muted">A second person approves it. Their name is on the record.</p>
                    </div>
                  </div>
                </div>
                <div aria-hidden className="glass absolute -top-5 right-6 hidden items-center gap-2 rounded-[var(--radius-pill)] border border-hairline px-3.5 py-2 shadow-panel sm:flex">
                  <span className="h-2 w-2 rounded-full bg-warn" />
                  <span className="text-xs font-semibold text-ink">New version published</span>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Programme field strip (live taxonomy) ────────────────────────── */}
      {previewFields.length > 0 && (
        <section aria-label="Programme fields on the platform" className="border-y border-hairline bg-surface/60">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-8 gap-y-3 px-5 py-6 sm:px-8 lg:px-10">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">Programmes include</p>
            <ul className="flex flex-wrap gap-2">
              {previewFields.map((item) => (
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
            eyebrow={`Why ${SITE.code}`}
            title={<span id="features-title">Built to keep training material findable, not to lose it gracefully.</span> as unknown as string}
            description="A catalogue with a memory: what was uploaded, for which programme, by whom, and which version was in force on the day you needed it."
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
            <SectionHeading eyebrow="How it works" title={<span id="how-title">From sign-in to the right version, in four steps.</span> as unknown as string} />
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
            <MapArt />
            <RegionMap className="relative mx-auto h-auto w-full max-w-[21rem]" />
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          <div className="space-y-6">
            <SectionHeading
              eyebrow="Where it is live"
              title={<span id="regions-title">Live in {LIVE_REGION.name}. {SITE.regionCount - 1} regions to follow.</span> as unknown as string}
              description={`The library is running in the ${LIVE_REGION.name} Region, with Wa as its hub. The other fifteen regions are already on the rollout map and are next; nothing is half-live elsewhere, so what you see here is what you get.`}
            />
            <ul className="flex flex-wrap gap-2">
              {GHS_REGIONS.map((region) => {
                const live = region === LIVE_REGION.name;
                return (
                  <li
                    key={region}
                    className={
                      live
                        ? "inline-flex items-center gap-2 rounded-[var(--radius-pill)] border border-primary bg-primary px-3 py-1.5 text-xs font-bold text-primary-ink"
                        : "rounded-[var(--radius-pill)] border border-dashed border-hairline px-3 py-1.5 text-xs font-semibold text-ink-muted"
                    }
                  >
                    {region}
                    {live ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary-ink/15 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide">
                        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-primary-ink" />
                        Live
                      </span>
                    ) : (
                      <span className="ml-1 text-[10px] font-bold uppercase tracking-wide opacity-70">Soon</span>
                    )}
                  </li>
                );
              })}
            </ul>
            <p className="text-xs text-ink-muted">
              Working in a region that is not live yet?{" "}
              <Link href="/help/report" className="font-semibold text-primary hover:underline underline-offset-4">
                Tell us through the Complaint Hub
              </Link>{" "}
              and you will be told as soon as it opens.
            </p>
          </div>
        </Reveal>
      </section>

      {/* ── Programme fields ─────────────────────────────────────────────── */}
      <section aria-labelledby="programmes-title" className="bg-surface/60 py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <Reveal>
              <SectionHeading eyebrow="Programmes" title={<span id="programmes-title">Filed by the programme fields that run the training.</span> as unknown as string} />
            </Reveal>
            <Reveal delay={0.1}>
              <Link href="/programmes" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:underline underline-offset-4">
                All programmes
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </Reveal>
          </div>

          {previewFields.length === 0 ? (
            <div className="mt-14 flex flex-col items-center gap-4 rounded-card border border-dashed border-hairline bg-canvas p-12 text-center">
              <EmptyArt variant="folder" className="h-28 w-auto text-ink-muted" />
              <p className="text-sm text-ink-muted">Programmes will appear here as the programme taxonomy is published.</p>
            </div>
          ) : (
            <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {previewFields.map((item, index) => (
                <Reveal key={item.id} delay={(index % 3) * 0.06}>
                  <li className="h-full list-none">
                    <ProgrammeFieldTile field={item} href="/programmes" />
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
          <SectionHeading eyebrow="For every cadre" title={<span id="cadres-title">Who the material is for.</span> as unknown as string} />
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
              alt="Two nurses at a district hospital desk reading a printed clinical protocol together"
              width={1200}
              height={627}
              sizes="(min-width: 1280px) 1200px, 100vw"
              className="h-[24rem] w-full object-cover sm:h-[28rem]"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-canvas/95 via-canvas/70 to-canvas/10" aria-hidden />
            <div className="absolute inset-0 flex items-center p-8 sm:p-14">
              <div className="max-w-lg space-y-5">
                <h2 id="band-title" className="text-3xl font-extrabold leading-tight text-ink sm:text-4xl">
                  The slides from your last training should still be findable.
                </h2>
                <p className="text-base leading-relaxed text-ink-muted">
                  Every session&apos;s material is filed under its programme, with the version and the date it changed. Ask for
                  the current copy and you get the current copy.
                </p>
                <Link href="/login" className={buttonClass({ className: "h-12 rounded-[var(--radius-pill)] px-6" })}>
                  Open your programmes
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
            <CtaArt />
            <div className="relative grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:items-center">
              <div className="space-y-4">
                <h2 id="cta-title" className="text-3xl font-extrabold leading-tight sm:text-4xl">
                  Find the material for your programme.
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
