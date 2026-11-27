import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BadgeCheck, CalendarDays, Search } from "lucide-react";
import { Reveal } from "@/components/marketing/reveal";
import { SectionHeading } from "@/components/marketing/section-heading";
import { Breadcrumb } from "@/components/marketing/breadcrumb";
import { BrowseError } from "@/components/marketing/browse-state";
import { formatDate } from "@/lib/format";
import { SITE } from "@/lib/site";
import { resolveAccount } from "@/lib/server/session";
import {
  getPublicAreaByCode,
  getPublicFieldByCode,
  listPublicTrainingsInField,
  type PublicTrainingCard,
} from "@/lib/server/public-browse";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ fieldCode: string; areaCode: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { areaCode } = await params;
  const row = await getPublicFieldByCode(areaCode);
  if (!row) return { title: "Trainings" };
  return {
    title: `Trainings — ${row.area.name}`,
    description: `The trainings GHS held for the ${row.area.name} Programme Field.`,
  };
}

function ResourceCard({ training, areaName, fieldName, signedIn }: { training: PublicTrainingCard; areaName: string; fieldName: string; signedIn: boolean }) {
  const held = training.status === "COMPLETED";
  return (
    <li className="h-full list-none">
      <article className="group flex h-full flex-col rounded-card border border-hairline bg-surface p-5 shadow-panel transition-[transform,box-shadow,border-color] duration-base ease-out-quint hover:-translate-y-1 hover:border-primary/40 hover:shadow-lift">
        <div className="flex items-start justify-between gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-control border border-hairline bg-mint text-primary">
            <CalendarDays className="h-5 w-5" aria-hidden />
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] bg-mint px-2.5 py-1 text-[11px] font-bold text-primary">
            <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
            {held ? "Held" : training.status === "PLANNED" ? "Planned" : "Cancelled"}
          </span>
        </div>
        <div className="mt-4 min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            {training.attendeeCount !== null ? `${training.attendeeCount.toLocaleString("en-GB")} trained` : "Training"}
          </p>
          <h3 className="mt-1 text-base font-semibold leading-snug text-ink">{training.title}</h3>
          {training.facilitatorName && (
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-muted">Led by {training.facilitatorName}</p>
          )}
        </div>
        <dl className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-hairline pt-3 text-xs text-ink-muted">
          <div className="flex gap-1.5">
            <dt className="sr-only">Programme Area</dt>
            <dd>
              <span className="font-semibold">Area:</span> {areaName}
            </dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="sr-only">Programme Field</dt>
            <dd>
              <span className="font-semibold">Field:</span> {fieldName}
            </dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="sr-only">Date</dt>
            <dd>
              <span className="font-semibold">Held:</span> {formatDate(training.organisedOn)}
            </dd>
          </div>
          {training.venue && (
            <div className="flex gap-1.5">
              <dt className="sr-only">Venue</dt>
              <dd>{training.venue}</dd>
            </div>
          )}
        </dl>
        <Link
          href={signedIn ? `/trainings/${training.id}` : "/login"}
          className="mt-4 inline-flex min-h-11 items-center justify-between gap-2 rounded-control border border-hairline bg-canvas px-4 text-sm font-semibold text-ink transition-colors hover:border-primary/50 hover:text-primary"
        >
          {signedIn ? "Open the training" : "Sign in to open"}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </article>
    </li>
  );
}

/**
 * One Programme Field: its parent relationship stated in the breadcrumb and on
 * the page, then the trainings GHS held for it (8.3, 8.4).
 *
 * It listed training *materials* here. Material belongs to the training it was
 * used at (ADR-0031), so what the public can browse for a programme field is the
 * trainings held for it; the slides and reports are on the training itself.
 */
export default async function ProgrammeFieldPage({ params }: Props) {
  const { fieldCode, areaCode } = await params;

  const [area, fieldRow, account] = await Promise.all([
    getPublicAreaByCode(fieldCode),
    getPublicFieldByCode(areaCode),
    resolveAccount(),
  ]);

  if (area === undefined || fieldRow === undefined) {
    return (
      <div className="mx-auto max-w-7xl px-5 pb-28 pt-10 sm:px-8 lg:px-10">
        <BrowseError title="We couldn't load these trainings." />
      </div>
    );
  }
  if (!area || !fieldRow) notFound();
  // The two codes in the URL must describe one chain: a field from another area
  // is a broken link, not a neighbouring page.
  if (fieldRow.field.id !== area.id) notFound();

  const field = fieldRow.area; // the Programme Field (child node)
  const trainings = await listPublicTrainingsInField(field.id);
  if (trainings === undefined) {
    return (
      <div className="mx-auto max-w-7xl px-5 pb-28 pt-10 sm:px-8 lg:px-10">
        <BrowseError title="We couldn't load these trainings." />
      </div>
    );
  }

  const signedIn = account.state === "active";

  return (
    <>
      <section className="hero-glow relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-5 pb-10 pt-10 sm:px-8 sm:pt-16 lg:px-10">
          <Breadcrumb
            items={[
              { label: "Home", href: "/" },
              { label: "Programme Areas", href: "/programmes" },
              { label: area.name, href: `/programmes/${area.code}` },
              { label: field.name },
            ]}
          />
          <Reveal className="mt-6 max-w-3xl space-y-5">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Programme Field · under{" "}
              <Link href={`/programmes/${area.code}`} className="underline-offset-4 hover:underline">
                {area.name}
              </Link>
            </p>
            <h1 className="text-balance text-4xl font-extrabold leading-[1.05] tracking-tight text-ink sm:text-5xl">
              {field.name}
            </h1>
            {field.description && <p className="text-lg leading-relaxed text-ink-muted">{field.description}</p>}
          </Reveal>
        </div>
      </section>

      <section aria-labelledby="trainings-title" className="mx-auto max-w-7xl px-5 pb-28 sm:px-8 lg:px-10">
        <Reveal>
          <SectionHeading
            eyebrow="Under this Programme Field"
            title={<span id="trainings-title">Trainings</span> as unknown as string}
            description="What GHS held for this Programme Field: the event, who led it, who attended — and the slides, attendance sheet and report on each training."
          />
        </Reveal>

        <p aria-live="polite" className="mt-8 text-sm text-ink-muted">
          {trainings.length} {trainings.length === 1 ? "training" : "trainings"} on record for{" "}
          {field.name}.
        </p>

        {trainings.length === 0 ? (
          <div className="mt-8 rounded-card border border-dashed border-hairline bg-surface/60 p-10 text-center">
            <Search className="mx-auto h-10 w-10 text-ink-muted" aria-hidden />
            <p className="mt-4 text-sm font-semibold text-ink">No trainings on record yet.</p>
            <p className="mt-1.5 text-sm text-ink-muted">
              Trainings held for this Programme Field will appear here once a facilitator has recorded them.
            </p>
            <Link href="/programmes" className="mt-4 inline-flex text-sm font-semibold text-primary underline-offset-4 hover:underline">
              Back to Programme Areas
            </Link>
          </div>
        ) : (
          <ul className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {trainings.map((training, index) => (
              <Reveal key={training.id} delay={(index % 3) * 0.06}>
                <ResourceCard
                  training={training}
                  areaName={area.name}
                  fieldName={field.name}
                  signedIn={signedIn}
                />
              </Reveal>
            ))}
          </ul>
        )}

        {!signedIn && (
          <Reveal className="mt-14 rounded-card border border-hairline bg-surface p-7 shadow-panel">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-ink">Preview and download after sign-in</p>
                <p className="mt-1 text-xs text-ink-muted">
                  {SITE.name} is for authorised Ghana Health Service personnel.
                </p>
              </div>
              <Link
                href="/login"
                className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-pill)] bg-primary px-5 text-sm font-semibold text-primary-ink transition-transform duration-fast hover:-translate-y-0.5"
              >
                Sign in to the Library
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </Reveal>
        )}
      </section>
    </>
  );
}
