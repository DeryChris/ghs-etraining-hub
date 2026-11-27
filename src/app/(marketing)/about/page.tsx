import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ClipboardPen, Eye, History, Lock, Search, ShieldCheck, Users } from "lucide-react";
import { Reveal } from "@/components/marketing/reveal";
import { SectionHeading } from "@/components/marketing/section-heading";
import { buttonClass } from "@/components/ui/button";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "About the Library",
  description: `Why the ${SITE.name} exists, how it works and who can access it.`,
};

const SUBSECTIONS: { id: string; eyebrow: string; title: string; body: string[] }[] = [
  {
    id: "purpose",
    eyebrow: "Our Purpose",
    title: "Make institutional training knowledge easier to organise, retrieve and maintain.",
    body: [
      `The ${SITE.fullName} is an institutional digital platform designed to improve the organisation, management and accessibility of training materials associated with programmes within the ${SITE.regionName}.`,
      "The platform provides a structured environment for maintaining learning resources, supporting document version control, facilitating review and approval processes and preserving relevant resource activity records.",
    ],
  },
  {
    id: "why",
    eyebrow: "Why the Library Exists",
    title: "Training knowledge should never get lost.",
    body: [
      "Training teams may need to retain slides, documents and references after a session. When materials are shared only through informal channels, they can be difficult to retrieve and keep current.",
      "When authorised personnel submit and publish a material, the library organises it under its Programme Area and Programme Field and keeps its supported version and review details.",
    ],
  },
  {
    id: "how",
    eyebrow: "How the Platform Works",
    title: "A clear hierarchy, from programme to resource.",
    body: [
      "Programme Areas contain Programme Fields, and training materials are filed under the relevant Programme Field while retaining their parent Programme Area. Anyone can browse Programme Areas and see listings for publicly visible Training Materials. After signing in, staff can search the separate Library and open the current published version allowed by their role and audience.",
    ],
  },
  {
    id: "resources",
    eyebrow: "Resource Management",
    title: "Version history follows each published update.",
    body: [
      "A new upload does not overwrite the existing file. When a newer version is approved, earlier versions remain in the history and are clearly distinguished from the current version for authorised users.",
    ],
  },
  {
    id: "accountability",
    eyebrow: "Institutional Accountability",
    title: "Reviewed before it goes live, and never silently deleted.",
    body: [
      "Submissions, reviews, approvals, updates and withdrawals are recorded. A second person reviews material before publication, and the activity record behind each resource is preserved for reference.",
    ],
  },
  {
    id: "access",
    eyebrow: "Who Can Access the Library",
    title: "Authorised Ghana Health Service personnel.",
    body: [
      "An active GHS staff directory record is required. A person with an unclaimed record can verify their Staff ID on the public registration page and set a password; that form cannot add a new staff-directory record. Access to materials and management actions follows the account's assigned role and scope.",
    ],
  },
];

const ROLES = [
  {
    icon: Users,
    name: "Staff",
    who: "Ghana Health Service personnel",
    body: "Browse Programme Areas and listings for publicly visible Training Materials. When signed in, access follows the account's role and audience.",
  },
  {
    icon: ClipboardPen,
    name: "Facilitators",
    who: "Programme subject experts",
    body: "Submit and maintain materials within assigned Programme Areas or Programme Fields. New versions go through the review and publication workflow.",
  },
  {
    icon: ShieldCheck,
    name: "Unit heads and administrators",
    who: "Review and system administration",
    body: "Unit heads review submissions within their assigned scope. System administrators manage directory access and programme reference data.",
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
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 pb-16 pt-10 sm:px-8 sm:pt-16 lg:grid-cols-12 lg:gap-12 lg:px-10">
          <Reveal className="space-y-7 lg:col-span-7">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">About the Library</p>
            <h1 id="about-title" className="text-balance text-4xl font-extrabold leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-6xl">
              About the {SITE.name}
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-ink-muted">
              The {SITE.fullName} is an institutional digital platform designed to improve the organisation, management
              and accessibility of training materials associated with programmes within the {SITE.regionName}.
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

      {/* The six subsections, in order. */}
      {SUBSECTIONS.map((section, index) => (
        <section
          key={section.id}
          id={section.id}
          aria-labelledby={`${section.id}-title`}
          className={index % 2 === 1 ? "bg-surface/60 py-20 lg:py-24" : "py-20 lg:py-24"}
        >
          <div className="mx-auto grid max-w-7xl gap-8 px-5 sm:px-8 lg:grid-cols-[0.42fr_0.58fr] lg:px-10">
            <Reveal>
              <div className="space-y-3 lg:sticky lg:top-24 lg:self-start">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{section.eyebrow}</p>
                <h2 id={`${section.id}-title`} className="text-balance text-2xl font-extrabold leading-tight tracking-tight text-ink sm:text-3xl">
                  {section.title}
                </h2>
              </div>
            </Reveal>
            <Reveal delay={0.06}>
              <div className="space-y-4">
                {section.body.map((paragraph) => (
                  <p key={paragraph.slice(0, 40)} className="text-base leading-relaxed text-ink-muted">
                    {paragraph}
                  </p>
                ))}
              </div>
            </Reveal>
          </div>
        </section>
      ))}

      {/* Roles */}
      <section aria-labelledby="roles-title" className="bg-surface/60 py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <Reveal>
            <SectionHeading
              eyebrow="Access"
              title={<span id="roles-title">Different access for different responsibilities.</span> as unknown as string}
              description="Access follows the directory role and assigned scope. Unit heads carry a review duty; system administrators manage access and reference data. Changes to authority are recorded."
            />
          </Reveal>
          <ul className="mt-12 grid gap-5 md:grid-cols-3">
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

      {/* Principles strip */}
      <section aria-label="Design principles" className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10">
        <ul className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: History, text: "Published materials can be archived; their supported history is retained." },
            { icon: Lock, text: "No patient information, ever. Personal data is protected." },
            { icon: Search, text: "Findable first: hierarchy, search and version clarity." },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.text} className="flex items-center gap-3 rounded-card border border-hairline bg-surface px-5 py-4 shadow-panel">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-mint text-primary">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <p className="text-sm font-semibold leading-snug text-ink">{item.text}</p>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Closing */}
      <section aria-labelledby="about-cta" className="mx-auto max-w-7xl px-5 pb-10 text-center sm:px-8 lg:px-10">
        <Reveal className="mx-auto max-w-2xl space-y-6">
          <Eye className="mx-auto h-8 w-8 text-primary" aria-hidden />
          <h2 id="about-cta" className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            Browse the Programme Areas.
          </h2>
          <p className="text-base leading-relaxed text-ink-muted">
            Open a Programme Area to see its Programme Fields. Listings for Training Materials published for public access appear under the relevant Programme Field; account setup requires a matching record in the staff directory.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/programmes" className={buttonClass({ className: "h-12 rounded-[var(--radius-pill)] px-6" })}>
              Explore Programme Areas
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link href="/login" className={buttonClass({ variant: "secondary", className: "h-12 rounded-[var(--radius-pill)] px-6" })}>
              Sign in
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
