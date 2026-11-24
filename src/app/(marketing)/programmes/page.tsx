import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Layers } from "lucide-react";
import { EmptyArt } from "@/components/brand/illustrations";
import { Reveal } from "@/components/marketing/reveal";
import { SectionHeading } from "@/components/marketing/section-heading";
import { buttonClass } from "@/components/ui/button";
import { listPublicFields } from "@/lib/server/learning-queries";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Programmes",
  description: `The programme fields GHS trains in, and the areas whose material is catalogued in the ${SITE.name}.`,
};

export default async function ProgrammesPage() {
  const fields = await listPublicFields();

  return (
    <>
      <section className="hero-glow relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-5 pb-16 pt-16 sm:px-8 sm:pt-24 lg:px-10">
          <Reveal className="max-w-3xl space-y-6">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              <Layers className="h-4 w-4" aria-hidden />
              Programmes
            </p>
            <h1 className="text-balance text-4xl font-extrabold leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-6xl">
              Learning owned by the fields that set the standards.
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-ink-muted">
              Each field publishes its own protocols, programmeAreas and assessments. Sign in to open them and record what you have read.
            </p>
          </Reveal>
        </div>
      </section>

      <section aria-labelledby="field-list" className="mx-auto max-w-7xl px-5 pb-28 sm:px-8 lg:px-10">
        <h2 id="field-list" className="sr-only">
          Directorates
        </h2>

        {fields.length === 0 ? (
          <div className="flex flex-col items-center gap-5 rounded-card border border-dashed border-hairline bg-surface p-14 text-center">
            <EmptyArt variant="folder" className="h-32 w-auto text-ink-muted" />
            <SectionHeading align="center" title="No programmes are published yet" description="Directorates publish their programmes here once they are ready for staff." />
          </div>
        ) : (
          <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {fields.map((field, index) => (
              <Reveal key={field.id} delay={(index % 3) * 0.06}>
                <li className="h-full list-none">
                  <article className="group flex h-full flex-col gap-4 rounded-card border border-hairline bg-surface p-7 shadow-panel transition-[transform,border-color] duration-base ease-out-quint hover:-translate-y-1 hover:border-primary/40">
                    <div className="flex items-center justify-between gap-3">
                      <span className="rounded-md bg-surface-2 px-2 py-1 font-mono text-[11px] font-semibold tracking-wide text-ink-muted">{field.code}</span>
                      <span className="text-xs font-semibold text-ink-muted">
                        {field.materialCount} {field.materialCount === 1 ? "material" : "materials"}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold leading-snug text-ink">{field.name}</h3>
                    {field.description && <p className="text-sm leading-relaxed text-ink-muted">{field.description}</p>}
                    <div className="mt-auto flex items-center justify-between gap-3 border-t border-hairline pt-5">
                      <span className="text-sm font-semibold text-ink-muted">
                        {field.areaCount} {field.areaCount === 1 ? "module" : "modules"}
                      </span>
                      <Link href="/login" className="inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-primary">
                        Sign in to open
                        <ArrowRight className="h-4 w-4 transition-transform duration-base group-hover:translate-x-1" aria-hidden />
                      </Link>
                    </div>
                  </article>
                </li>
              </Reveal>
            ))}
          </ul>
        )}

        <Reveal className="mt-16 flex flex-col items-start justify-between gap-6 rounded-hero border border-hairline bg-surface p-8 shadow-panel sm:flex-row sm:items-center sm:p-10">
          <div>
            <h2 className="text-xl font-bold text-ink">Want a programme for your facility?</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-muted">
              Directorate leads and facilitators propose new programmeAreas through the platform. Your facility can raise a request through the contact
              page.
            </p>
          </div>
          <Link href="/contact" className={buttonClass({ variant: "secondary", className: "shrink-0 rounded-[var(--radius-pill)] px-5" })}>
            Contact us
          </Link>
        </Reveal>
      </section>
    </>
  );
}
