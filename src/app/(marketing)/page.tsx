import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  ClipboardCheck,
  FileText,
  FolderTree,
  GraduationCap,
  HeartPulse,
  History,
  LayoutGrid,
  Library,
  MapPinned,
  Pill,
  Search,
  ShieldCheck,
  Stethoscope,
  FlaskConical,
  Upload,
  Users,
  type LucideIcon,
} from "lucide-react";
import { UpperWestMap } from "@/components/brand/illustrations";
import { CtaArt, HeroArt, MapArt } from "@/components/marketing/landing-art";
import { CountUp } from "@/components/marketing/count-up";
import { Faq } from "@/components/marketing/faq";
import { Reveal } from "@/components/marketing/reveal";
import { ProgrammeFieldTile } from "@/components/programme/programme-tile";
import { SectionHeading } from "@/components/marketing/section-heading";
import { buttonClass } from "@/components/ui/button";
import { SITE } from "@/lib/site";
import { getPublicStatsCached } from "@/lib/server/public-queries";
import { listPublicAreas } from "@/lib/server/public-browse";

export const metadata: Metadata = {
  title: { absolute: `${SITE.name} | Ghana Health Service` },
  description: SITE.description,
};

/* ── Platform capabilities (7.5) ──────────────────────────────────────────── */

const FEATURES: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Library,
    title: "Centralised Resource Management",
    body: "Bring institutional training materials together in one organised digital environment. Find resources through their associated Programme Areas and Programme Fields.",
  },
  {
    icon: FolderTree,
    title: "Structured Programme Organisation",
    body: "Navigate a clear hierarchy of Programme Areas, their respective Programme Fields and associated training materials.",
  },
  {
    icon: History,
    title: "Document Version Control",
    body: "Maintain previous editions of training documents while clearly identifying the latest approved version.",
  },
  {
    icon: ClipboardCheck,
    title: "Review and Approval",
    body: "Support an organised review process that allows designated personnel to examine and approve submitted resources before publication.",
  },
  {
    icon: ShieldCheck,
    title: "Resource Accountability",
    body: "Maintain records of resource submissions, reviews, approvals, updates and other supported activities.",
  },
  {
    icon: Search,
    title: "Easy Resource Access",
    body: "After signing in, browse, preview and download published training materials through a clear and accessible interface.",
  },
];

/* ── How the platform works (7.6) ─────────────────────────────────────────── */

const STEPS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: FolderTree,
    title: "Organise",
    body: "Resources are assigned to the appropriate Programme Area and Programme Field.",
  },
  {
    icon: Upload,
    title: "Submit",
    body: "Authorised personnel upload training materials with relevant document information and version details.",
  },
  {
    icon: ClipboardCheck,
    title: "Review and Publish",
    body: "Designated reviewers examine submissions and approve suitable resources for publication.",
  },
  {
    icon: Library,
    title: "Access and Maintain",
    body: "Authorised users access published materials while designated personnel maintain updates, version histories and resource records.",
  },
];

/* ── Who the platform serves (7.9) ────────────────────────────────────────── */

const AUDIENCE: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: HeartPulse, title: "Nurses and Midwives", body: "Browse materials published for nursing and midwifery programmes, when available." },
  { icon: Stethoscope, title: "Medical Officers", body: "Explore published resources filed under relevant clinical Programme Fields, as available." },
  { icon: Pill, title: "Pharmacists", body: "Browse published materials relevant to pharmacy practice when they are available." },
  { icon: FlaskConical, title: "Laboratory Professionals", body: "Find approved resources in Programme Fields relevant to laboratory work, when available." },
  { icon: MapPinned, title: "Public Health Professionals", body: "Browse published materials under relevant Programme Areas and Programme Fields." },
  { icon: GraduationCap, title: "Training Facilitators", body: "Submit and maintain materials within their assigned Programme Area or Programme Field scope." },
  { icon: Users, title: "Programme Teams", body: "Find published resources organised under the Programme Areas and Programme Fields they support; authoring access is assigned separately." },
  { icon: ShieldCheck, title: "Unit Heads and Administrators", body: "Unit heads review submissions within their assigned scope; system administrators manage access and reference data." },
];

/* ── FAQ ──────────────────────────────────────────────────────────────────── */

const FAQ = [
  {
    question: `What is the ${SITE.name}?`,
    answer: `The ${SITE.fullName} is an institutional digital library for the training GHS runs in the Upper West Region. Browse visible Programme Areas and Programme Fields to reach the trainings filed under them; a training and the files attached to it appear in public browse once the record has been reviewed and published.`,
  },
  {
    question: "Who can use it?",
    answer:
      "Ghana Health Service staff with an active, unclaimed record in the staff directory can use Create an account to verify their Staff ID and set up access. The form cannot create a staff-directory record; if your ID is not recognised, report it through the Complaint Hub.",
  },
  {
    question: "What happens to material shared in chat groups?",
    answer:
      "The Library does not import chat history or files automatically. A file is attached to the training it belongs to, by the facilitator who ran it, and the training goes through review before it is published. Once published, it is found under its Programme Area and Programme Field, and its files sit on the training itself.",
  },
  {
    question: "Can I still open an older version?",
    answer:
      "After signing in, authorised users can view superseded versions in the history. They are clearly marked, while the current published version is identified separately.",
  },
  {
    question: "Who can upload or remove material?",
    answer:
      "Authorised personnel can submit materials for review and publication. Published material can be archived rather than silently removed, and supported actions are recorded in the audit history.",
  },
  {
    question: "What does the library keep about me?",
    answer:
      "When you use the signed-in Library, material opens and controlled downloads can be recorded against the material and version for operational activity.",
  },
  {
    question: "I forgot my password. What now?",
    answer:
      "There is no automated password-reset email. Ask your facility administrator or ICT helpdesk to issue a one-time reset link; it expires after an hour. If you cannot reach them, report the access problem through the Complaint Hub.",
  },
];

export default async function LandingPage() {
  const [stats, areas] = await Promise.all([getPublicStatsCached(), listPublicAreas()]);
  // `undefined` means the database did not answer: the section is omitted rather
  // than shown with empty numbers. `[]` is a real answer and gets the empty state.
  const previewAreas = Array.isArray(areas) ? areas.slice(0, 6) : null;

  return (
    <>
      {/* ── Hero (7.2) ──────────────────────────────────────────────────── */}
      <section aria-labelledby="hero-title" className="relative overflow-hidden">
        <HeroArt />
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 pb-16 pt-10 sm:px-8 sm:pt-16 lg:grid-cols-12 lg:gap-10 lg:px-10 lg:pb-24 lg:pt-20">
          <div className="space-y-7 lg:col-span-6">
            <Reveal>
              <p className="inline-flex items-center gap-2.5 rounded-[var(--radius-pill)] border border-hairline bg-surface/80 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted backdrop-blur">
                <span className="relative flex h-2 w-2" aria-hidden>
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                </span>
                Ghana Health Service · Upper West Regional Health Directorate
              </p>
            </Reveal>

            <Reveal delay={0.06}>
              <h1 id="hero-title" className="text-balance text-[2.75rem] font-extrabold leading-[1.04] tracking-tight text-ink sm:text-6xl lg:text-[4rem]">
                Knowledge organised.{" "}
                <span className="text-primary">Training resources within reach.</span>
              </h1>
            </Reveal>

            <Reveal delay={0.12}>
              <div className="max-w-xl space-y-4">
                <p className="text-base leading-relaxed text-ink-muted sm:text-lg">
                  The {SITE.fullName} provides a centralised platform for organising, managing and accessing institutional
                  training materials.
                </p>
                <p className="text-base leading-relaxed text-ink-muted sm:text-lg">
                  Browse Programme Areas and Programme Fields. Published Training Materials appear under their Programme Field when
                  they are available, with the current published version identified.
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.18}>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/programmes"
                  className={buttonClass({ className: "h-12 rounded-[var(--radius-pill)] px-6 text-[15px] shadow-lift" })}
                >
                  Explore Programme Areas
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <Link
                  href="/login"
                  className={buttonClass({ variant: "secondary", className: "h-12 rounded-[var(--radius-pill)] px-6 text-[15px]" })}
                >
                  Sign in to the Library
                </Link>
              </div>
            </Reveal>

            <Reveal delay={0.24}>
              <p className="text-sm text-ink-muted">
                A central resource for training materials in the {SITE.regionName}.
              </p>
            </Reveal>
          </div>

          <div className="relative lg:col-span-6">
            <Reveal delay={0.1}>
              <div className="relative mx-auto max-w-[34rem]">
                <div
                  aria-hidden
                  className="absolute -inset-4 -z-10 rounded-[2.5rem] opacity-70"
                  style={{
                    background:
                      "linear-gradient(135deg, color-mix(in oklab, var(--primary) 24%, transparent), transparent 52%, color-mix(in oklab, var(--accent) 18%, transparent))",
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

                {/* Floating interface composition: decorative representations of real
                    platform capabilities, never the only source of information. */}
                <div aria-hidden className="glass drift absolute -left-4 top-10 hidden w-60 rounded-card border border-hairline p-4 shadow-lift sm:block">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-mint text-primary">
                      <FileText className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-muted">Illustrative interface</p>
                      <p className="text-sm font-bold text-ink">Training Material</p>
                      <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
                        <History className="h-3.5 w-3.5" /> Version history
                      </p>
                    </div>
                  </div>
                </div>
                <div aria-hidden className="glass absolute -bottom-6 right-4 w-64 rounded-card border border-hairline p-4 shadow-lift sm:right-0" style={{ animation: "drift 8s ease-in-out -2s infinite" }}>
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-ink">
                      <ClipboardCheck className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-ink">Review before publication</p>
                      <p className="text-xs leading-relaxed text-ink-muted">Designated reviewers assess submissions before publication.</p>
                    </div>
                  </div>
                </div>
                <div aria-hidden className="glass absolute -top-5 right-6 hidden items-center gap-2 rounded-[var(--radius-pill)] border border-hairline px-3.5 py-2 shadow-panel sm:flex">
                  <History className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-semibold text-ink">Version history</span>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Statistics (7.3) ─────────────────────────────────────────────── */}
      {stats && (
      <section aria-labelledby="stats-title" className="border-y border-hairline bg-surface/70">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
          <Reveal>
            <SectionHeading
              eyebrow="The library at a glance"
              title={<span id="stats-title">The library at a glance.</span> as unknown as string}
              description="Counts are drawn from publicly visible taxonomy, the files attached to published Training Sessions, and those sessions themselves, recorded for the Upper West Region."
            />
          </Reveal>
          <dl className="mt-12 grid grid-cols-2 gap-5 lg:grid-cols-4">
              {[
                { icon: LayoutGrid, value: stats.programmeAreas, label: "Programme Areas" },
                { icon: FolderTree, value: stats.programmeFields, label: "Programme Fields" },
                { icon: Library, value: stats.files, label: "Files attached to trainings" },
                { icon: GraduationCap, value: stats.trainings, label: "Training Sessions" },
              ].map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <Reveal key={stat.label} delay={index * 0.06}>
                    <div className="h-full rounded-card border border-hairline bg-mint/70 p-6">
                      <span className="flex h-10 w-10 items-center justify-center rounded-control bg-surface text-primary shadow-panel">
                        <Icon className="h-5 w-5" aria-hidden />
                      </span>
                      <dd className="mt-5 text-4xl font-extrabold tracking-tight text-ink">
                        <CountUp value={stat.value} />
                      </dd>
                      <dt className="mt-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">{stat.label}</dt>
                    </div>
                  </Reveal>
                );
              })}
          </dl>
        </div>
      </section>
      )}

      {/* ── Problem and solution (7.4) ───────────────────────────────────── */}
      <section aria-labelledby="problem-title" className="mx-auto grid max-w-7xl items-center gap-14 px-5 py-24 sm:px-8 lg:grid-cols-2 lg:gap-20 lg:px-10 lg:py-32">
        <Reveal>
          <div className="space-y-6">
            <SectionHeading
              title={<span id="problem-title">Training knowledge should never get lost.</span> as unknown as string}
              description="Training resources are essential to continuous professional development and effective healthcare delivery. However, materials shared through messaging platforms and informal channels can become difficult to retrieve, organise and maintain. Important documents may get buried in conversations, and outdated copies can continue circulating long after newer versions have been introduced."
            />
            <p className="text-base leading-relaxed text-ink-muted">
              The {SITE.name} provides a structured digital environment where training resources are organised under their
              respective Programme Areas and Programme Fields. Every resource can be associated with its version history,
              upload details and review information, making institutional learning materials easier to locate, maintain and
              reference.
            </p>
            <Link href="/programmes" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:underline underline-offset-4">
              Explore the library
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          {/* A restrained comparison: scattered copies on one side, the hierarchy on the other. */}
          <div aria-hidden className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-card border border-dashed border-hairline bg-surface/60 p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-muted">Scattered copies</p>
              <div className="mt-4 space-y-2.5">
                {["Unversioned files", "Hard to find later", "Which copy is current?"].map((line) => (
                  <p key={line} className="rounded-control border border-hairline bg-canvas px-3 py-2.5 text-xs font-semibold text-ink-muted opacity-80">
                    {line}
                  </p>
                ))}
              </div>
            </div>
            <div className="rounded-card border border-primary/30 bg-mint/70 p-5 shadow-panel">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Organised library</p>
              <div className="mt-4 space-y-2">
                <p className="flex items-center gap-2 rounded-control bg-surface px-3 py-2.5 text-xs font-bold text-ink shadow-panel">
                  <LayoutGrid className="h-3.5 w-3.5 text-primary" /> Programme Area
                </p>
                <p className="ml-4 flex items-center gap-2 rounded-control bg-surface px-3 py-2.5 text-xs font-bold text-ink shadow-panel">
                  <FolderTree className="h-3.5 w-3.5 text-primary" /> Programme Field
                </p>
                <p className="ml-8 flex items-center gap-2 rounded-control bg-surface px-3 py-2.5 text-xs font-bold text-ink shadow-panel">
                  <FileText className="h-3.5 w-3.5 text-primary" /> Training Material
                </p>
                <p className="ml-8 flex items-center gap-2 text-[11px] font-semibold text-primary">
                  <BadgeCheck className="h-3.5 w-3.5" /> Version control · review · audit history
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── Platform capabilities (7.5) ──────────────────────────────────── */}
      <section aria-labelledby="features-title" className="bg-surface/60 py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <Reveal>
            <SectionHeading
              eyebrow="Capabilities"
              title={<span id="features-title">Everything organised in one place.</span> as unknown as string}
              description="A structured approach to managing training resources, from initial submission to approved publication and future reference."
            />
          </Reveal>
          <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Reveal key={feature.title} delay={(index % 3) * 0.06}>
                  <article className="group h-full rounded-card border border-hairline bg-surface p-7 shadow-panel transition-[transform,box-shadow,border-color] duration-base ease-out-quint hover:-translate-y-1 hover:border-primary/40 hover:shadow-lift">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-[1rem] bg-mint text-primary">
                      <Icon className="h-6 w-6" aria-hidden />
                    </span>
                    <h3 className="mt-6 text-lg font-bold text-ink">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink-muted">{feature.body}</p>
                  </article>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── How the platform works (7.6) ─────────────────────────────────── */}
      <section aria-labelledby="how-title" className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:px-10 lg:py-32">
        <Reveal>
          <SectionHeading
            eyebrow="How it works"
            title={<span id="how-title">From resource submission to easy access.</span> as unknown as string}
            description="The library provides a structured approach to managing institutional training materials throughout their lifecycle."
          />
        </Reveal>
        <ol className="relative mt-16 grid gap-10 md:grid-cols-4 md:gap-6">
          <div aria-hidden className="absolute left-6 top-7 bottom-7 w-px bg-gradient-to-b from-primary via-primary/40 to-accent md:left-7 md:right-7 md:top-7 md:bottom-auto md:h-px md:w-auto md:bg-gradient-to-r" />
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <Reveal key={step.title} delay={index * 0.08}>
                <li className="relative list-none pl-10 md:pl-0">
                  <span className="absolute left-0 top-0 flex h-12 w-12 items-center justify-center rounded-full border border-hairline bg-canvas shadow-panel md:relative md:left-auto">
                    <Icon className="h-5 w-5 text-primary" aria-hidden />
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-extrabold text-accent-ink">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </span>
                  <div className="mt-0 md:mt-6">
                    <h3 className="text-lg font-bold text-ink">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink-muted">{step.body}</p>
                  </div>
                </li>
              </Reveal>
            );
          })}
        </ol>
      </section>

      {/* ── Programme Areas showcase (7.7) ───────────────────────────────── */}
      {previewAreas !== null && (
      <section aria-labelledby="areas-title" className="bg-surface/60 py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <Reveal>
              <SectionHeading
                eyebrow="Programme Areas"
                title={<span id="areas-title">Explore our Programme Areas.</span> as unknown as string}
                description="Browse the Programme Areas configured for the Upper West Regional Health Directorate. Open a Programme Area to view its Programme Fields; listings for published Training Materials appear under the relevant Programme Field when available."
              />
            </Reveal>
            <Reveal delay={0.1}>
              <Link href="/programmes" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:underline underline-offset-4">
                All Programme Areas
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </Reveal>
          </div>

          {previewAreas.length === 0 ? (
            <div className="mt-14 rounded-card border border-dashed border-hairline bg-canvas p-12 text-center">
              <p className="text-sm font-semibold text-ink">No Programme Areas are available yet.</p>
              <p className="mt-1.5 text-sm text-ink-muted">Programme Areas appear here once they have been configured for public browsing.</p>
            </div>
          ) : (
            <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {previewAreas.map((area, index) => (
                <Reveal key={area.id} delay={(index % 3) * 0.06}>
                  <li className="h-full list-none">
                    <ProgrammeFieldTile field={area} href={`/programmes/${area.code}`} />
                  </li>
                </Reveal>
              ))}
            </ul>
          )}
        </div>
      </section>
      )}

      {/* ── Resource management and version history (7.8) ────────────────── */}
      <section aria-labelledby="history-title" className="mx-auto grid max-w-7xl items-center gap-14 px-5 py-24 sm:px-8 lg:grid-cols-2 lg:gap-20 lg:px-10 lg:py-32">
        <Reveal>
          <div className="space-y-6">
            <SectionHeading
              eyebrow="Version history"
              title={<span id="history-title">Version history for published materials.</span> as unknown as string}
              description="Knowing which version is current and how a document changed helps authorised staff manage published training materials."
            />
            <p className="text-base leading-relaxed text-ink-muted">
              When a material is published, its version and review details are recorded. The library keeps previous versions
              available to authorised users according to the material&apos;s access rules.
            </p>
            <p className="rounded-card border border-primary/25 bg-mint px-5 py-4 text-sm font-semibold leading-relaxed text-ink">
              Know what changed. Know who reviewed it. Know which version you are using.
            </p>
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          <div className="rounded-card border border-hairline bg-surface p-6 shadow-panel sm:p-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-muted">Illustrative resource timeline</p>
            <ol className="mt-6 space-y-0">
              {[
                { icon: Upload, label: "Resource submitted", note: "Upload details recorded" },
                { icon: ClipboardCheck, label: "Review completed", note: "Reviewer identified" },
                { icon: BadgeCheck, label: "Resource approved", note: "Approved for publication" },
                { icon: History, label: "New version published", note: "Version number increased" },
                { icon: FileText, label: "Previous version retained", note: "Remains readable and marked" },
              ].map((event, index, list) => {
                const Icon = event.icon;
                const last = index === list.length - 1;
                return (
                  <li key={event.label} className="relative flex gap-4 pb-6 last:pb-0">
                    {!last && <span aria-hidden className="absolute left-[19px] top-10 bottom-0 w-px bg-hairline" />}
                    <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-hairline bg-canvas text-primary">
                      <Icon className="h-4.5 w-4.5" aria-hidden />
                    </span>
                    <div className="pt-1.5">
                      <p className="text-sm font-bold text-ink">{event.label}</p>
                      <p className="text-xs text-ink-muted">{event.note}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </Reveal>
      </section>

      {/* ── Who the platform serves (7.9) ────────────────────────────────── */}
      <section aria-labelledby="audience-title" className="bg-surface/60 py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <Reveal>
            <SectionHeading
              eyebrow="Who it serves"
              title={<span id="audience-title">Supporting the healthcare workforce.</span> as unknown as string}
              description="A shared resource environment for professionals involved in healthcare delivery, programme work and institutional training."
            />
          </Reveal>
          <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {AUDIENCE.map((item, index) => {
              const Icon = item.icon;
              return (
                <Reveal key={item.title} delay={(index % 4) * 0.05}>
                  <li className="h-full list-none rounded-card border border-hairline bg-surface p-6 transition-[transform,border-color] duration-base ease-out-quint hover:-translate-y-1 hover:border-primary/40">
                    <span className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-mint text-primary">
                      <Icon className="h-5.5 w-5.5" aria-hidden />
                    </span>
                    <h3 className="mt-5 text-base font-bold text-ink">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink-muted">{item.body}</p>
                  </li>
                </Reveal>
              );
            })}
          </ul>
          <Reveal>
            <p className="mt-8 text-sm text-ink-muted">
              This list is illustrative, not exhaustive. Access depends on the staff directory and assigned role; material
              availability depends on what has been published.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── Regional identity (7.10) ─────────────────────────────────────── */}
      <section aria-labelledby="region-title" className="mx-auto grid max-w-7xl items-center gap-14 px-5 py-24 sm:px-8 lg:grid-cols-2 lg:gap-20 lg:px-10 lg:py-32">
        <Reveal>
          <div className="relative overflow-hidden rounded-hero border border-hairline bg-surface p-8 shadow-panel sm:p-10">
            <MapArt />
            <div className="relative mx-auto flex max-w-[22rem] flex-col items-center gap-5">
              <UpperWestMap className="h-auto w-full max-w-[17rem]" />
              <div className="rounded-card border border-hairline bg-canvas/90 px-5 py-4 text-center shadow-panel">
                <p className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-primary">
                  <MapPinned className="h-4 w-4" aria-hidden />
                  {SITE.authority}
                </p>
                <p className="mt-1.5 text-sm font-semibold text-ink">{SITE.regionName} · Ghana</p>
              </div>
            </div>
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          <div className="space-y-6">
            <SectionHeading
              eyebrow="Regional identity"
              title={<span id="region-title">Serving the {SITE.regionName}.</span> as unknown as string}
              description={`The ${SITE.fullName} provides a centralised environment for organising and accessing training resources associated with programmes delivered within the region.`}
            />
            <p className="text-base leading-relaxed text-ink-muted">
              The platform supports the management of institutional learning materials, helping healthcare personnel access
              relevant training documents through a structured and reliable digital library.
            </p>
            <div className="rounded-card border border-hairline bg-mint/70 p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-muted">Institutional scope</p>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-ink">
                {SITE.institution} · {SITE.authority} · {SITE.tagline}
              </p>
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
              Still stuck? Read the{" "}
              <Link href="/contact" className="font-semibold text-primary underline-offset-4 hover:underline">
                contact page
              </Link>{" "}
              for who to ask.
            </p>
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          <Faq items={FAQ.map((item) => ({ question: item.question, answer: item.answer }))} />
        </Reveal>
      </section>

      {/* ── Final call to action (7.11) ──────────────────────────────────── */}
      <section aria-labelledby="cta-title" className="px-5 pb-24 sm:px-8 lg:px-10">
        <Reveal>
          <div className="relative mx-auto max-w-7xl overflow-hidden rounded-hero bg-primary px-8 py-14 text-primary-ink sm:px-14 sm:py-20">
            <CtaArt />
            <div className="relative grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:items-center">
              <div className="space-y-4">
                <h2 id="cta-title" className="text-3xl font-extrabold leading-tight sm:text-4xl">
                  Your training resources, organised and accessible.
                </h2>
                <p className="max-w-xl text-base leading-relaxed text-primary-ink/85">
                  Browse the Programme Areas and Programme Fields configured for the Upper West Regional Health Directorate. Open a
                  Programme Field to see the trainings held for it, or sign in to the Training Library to read what came with them.
                </p>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-ink/70">
                  For authorised Ghana Health Service personnel.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                <Link
                  href="/programmes"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-[var(--radius-pill)] bg-accent px-6 text-[15px] font-bold text-accent-ink transition-transform duration-fast hover:-translate-y-0.5"
                >
                  Explore Programme Areas
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex h-12 items-center justify-center rounded-[var(--radius-pill)] border border-primary-ink/30 px-6 text-[15px] font-semibold text-primary-ink transition-colors hover:bg-primary-ink/10"
                >
                  Sign in to the Library
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
