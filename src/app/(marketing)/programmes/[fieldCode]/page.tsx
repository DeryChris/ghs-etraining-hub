import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, FolderTree, Layers, Library } from "lucide-react";
import { Reveal } from "@/components/marketing/reveal";
import { SectionHeading } from "@/components/marketing/section-heading";
import { Breadcrumb } from "@/components/marketing/breadcrumb";
import { BrowseError } from "@/components/marketing/browse-state";
import { ProgrammeAreaTile } from "@/components/programme/programme-tile";
import { areaHref } from "@/lib/links";
import { getPublicAreaByCode, listPublicFieldsInArea } from "@/lib/server/public-browse";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ fieldCode: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { fieldCode } = await params;
  const area = await getPublicAreaByCode(fieldCode);
  if (!area) return { title: "Programme Area" };
  return {
    title: area.name,
    description: area.description ?? `Programme Fields in ${area.name}; public Training Materials appear when available.`,
  };
}

/**
 * One Programme Area: its identity, then the Programme Fields inside it as
 * nested children (8.2). The parent-child relationship is never inverted.
 */
export default async function ProgrammeAreaPage({ params }: Props) {
  const { fieldCode } = await params;
  const area = await getPublicAreaByCode(fieldCode);

  if (area === undefined) {
    return (
      <div className="mx-auto max-w-7xl px-5 pb-28 pt-10 sm:px-8 lg:px-10">
        <BrowseError title="We couldn't load this Programme Area." />
      </div>
    );
  }
  if (!area) notFound();

  const fields = await listPublicFieldsInArea(area.id);
  if (fields === undefined) {
    return (
      <div className="mx-auto max-w-7xl px-5 pb-28 pt-10 sm:px-8 lg:px-10">
        <BrowseError title="We couldn't load these Programme Fields." />
      </div>
    );
  }

  const fieldCount = fields.length;
  const materialCount = fields.reduce((total, field) => total + field.materialCount, 0);
  const trainingCount = fields.reduce((total, field) => total + field.trainingCount, 0);

  return (
    <>
      <section className="hero-glow relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-5 pb-12 pt-10 sm:px-8 sm:pt-16 lg:px-10">
          <Breadcrumb
            items={[{ label: "Home", href: "/" }, { label: "Programme Areas", href: "/programmes" }, { label: area.name }]}
          />
          <div className="mt-6 grid gap-10 lg:grid-cols-[1.5fr_1fr] lg:items-end">
            <Reveal className="space-y-5">
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                <Layers className="h-4 w-4" aria-hidden />
                Programme Area
              </p>
              <h1 className="text-balance text-4xl font-extrabold leading-[1.05] tracking-tight text-ink sm:text-5xl">
                {area.name}
              </h1>
              {area.description && (
                <p className="max-w-2xl text-lg leading-relaxed text-ink-muted">{area.description}</p>
              )}
              <dl className="flex flex-wrap gap-x-8 gap-y-3">
                <div className="flex items-baseline gap-2">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Programme Fields</dt>
                  <dd className="text-xl font-extrabold text-ink">{fieldCount}</dd>
                </div>
                <div className="flex items-baseline gap-2">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Training Materials</dt>
                  <dd className="text-xl font-extrabold text-ink">{materialCount}</dd>
                </div>
                <div className="flex items-baseline gap-2">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Training Sessions</dt>
                  <dd className="text-xl font-extrabold text-ink">{trainingCount}</dd>
                </div>
              </dl>
            </Reveal>
          </div>
        </div>
      </section>

      <section aria-labelledby="fields-title" className="mx-auto max-w-7xl px-5 pb-28 sm:px-8 lg:px-10">
        <Reveal>
          <SectionHeading
            eyebrow="Nested under this area"
            title={<span id="fields-title">Programme Fields</span> as unknown as string}
            description="Explore the Programme Fields under this Programme Area. Any Training Materials published for public access appear under the relevant field."
          />
        </Reveal>

        {fieldCount === 0 ? (
          <div className="mt-12 rounded-card border border-dashed border-hairline bg-surface/60 p-10 text-center">
            <FolderTree className="mx-auto h-10 w-10 text-ink-muted" aria-hidden />
            <p className="mt-4 text-sm font-semibold text-ink">No Programme Fields yet.</p>
            <p className="mt-1.5 text-sm text-ink-muted">
              There are currently no Programme Fields associated with this Programme Area.
            </p>
          </div>
        ) : (
          <ul className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {fields.map((field, index) => (
              <Reveal key={field.id} delay={(index % 3) * 0.06}>
                <li className="h-full list-none">
                  <ProgrammeAreaTile
                    area={field}
                    href={areaHref(area.code, field.code)}
                    meta={
                      <>
                        {field.materialCount} {field.materialCount === 1 ? "material" : "materials"} ·{" "}
                        {field.trainingCount} {field.trainingCount === 1 ? "training" : "trainings"}
                      </>
                    }
                  />
                </li>
              </Reveal>
            ))}
          </ul>
        )}

        <Reveal className="mt-14 rounded-card border border-hairline bg-surface p-7 shadow-panel">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-mint text-primary">
                <Library className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-bold text-ink">Signed-in staff can search the whole library</p>
                <p className="text-xs text-ink-muted">Preview, download and version history are available after sign-in.</p>
              </div>
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
      </section>
    </>
  );
}
