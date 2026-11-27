import type { Metadata } from "next";
import Link from "next/link";
import { Layers } from "lucide-react";
import { EmptyArt } from "@/components/brand/illustrations";
import { Reveal } from "@/components/marketing/reveal";
import { SectionHeading } from "@/components/marketing/section-heading";
import { ProgrammeFieldTile } from "@/components/programme/programme-tile";
import { buttonClass } from "@/components/ui/button";
import { listPublicFields } from "@/lib/server/learning-queries";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Programmes",
  description: `The programme fields GHS trains in, and the areas whose material is kept in the ${SITE.name} library.`,
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
              Each area publishes its own documents and material. Sign in to open them.
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
                  <ProgrammeFieldTile field={field} href="/login" />
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
