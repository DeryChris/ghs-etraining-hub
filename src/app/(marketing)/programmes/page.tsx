import type { Metadata } from "next";
import Link from "next/link";
import { LayoutGrid, Search } from "lucide-react";
import { Reveal } from "@/components/marketing/reveal";
import { Breadcrumb } from "@/components/marketing/breadcrumb";
import { BrowseError } from "@/components/marketing/browse-state";
import { ProgrammeFieldTile } from "@/components/programme/programme-tile";
import { SITE } from "@/lib/site";
import { listPublicAreas } from "@/lib/server/public-browse";

export const metadata: Metadata = {
  title: "Explore Programme Areas",
  description: `Browse Programme Areas and their Programme Fields in the ${SITE.authority}; publicly visible Training Materials appear when available.`,
};

export default async function ProgrammesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const [areas, params] = await Promise.all([listPublicAreas(), searchParams]);

  if (areas === undefined) {
    return (
      <div className="mx-auto max-w-7xl px-5 pb-28 pt-10 sm:px-8 lg:px-10">
        <BrowseError title="We couldn't load the Programme Areas." />
      </div>
    );
  }

  const query = (params.q ?? "").trim().toLowerCase();
  const visible = query
    ? areas.filter(
        (area) =>
          area.name.toLowerCase().includes(query) ||
          (area.description ?? "").toLowerCase().includes(query),
      )
    : areas;

  return (
    <>
      <section className="hero-glow relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-5 pb-10 pt-10 sm:px-8 sm:pt-16 lg:px-10">
          <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Programme Areas" }]} />
          <Reveal className="mt-6 max-w-3xl space-y-6">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              <LayoutGrid className="h-4 w-4" aria-hidden />
              Programme Areas
            </p>
            <h1 className="text-balance text-4xl font-extrabold leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-6xl">
              Explore Programme Areas
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-ink-muted">
              Browse the Programme Areas of the {SITE.authority} and open a Programme Field to see any Training Materials
              published for public access.
            </p>
          </Reveal>
        </div>
      </section>

      <section aria-labelledby="area-list" className="mx-auto max-w-7xl px-5 pb-28 sm:px-8 lg:px-10">
        <h2 id="area-list" className="sr-only">
          Programme Areas
        </h2>

        <Reveal>
          <form action="/programmes" method="get" role="search" className="flex max-w-xl flex-wrap items-end gap-3">
            <div className="min-w-56 flex-1">
              <label htmlFor="area-q" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-muted">
                Search Programme Areas
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden />
                <input
                  id="area-q"
                  name="q"
                  type="search"
                  defaultValue={params.q ?? ""}
                  placeholder="Name or description"
                  className="min-h-11 w-full rounded-control border border-hairline bg-surface pl-10 pr-4 text-sm text-ink shadow-panel placeholder:text-ink-muted/70 focus-visible:outline-2 focus-visible:outline-primary"
                />
              </div>
            </div>
            <button
              type="submit"
              className="inline-flex min-h-11 items-center gap-2 rounded-control bg-primary px-5 text-sm font-semibold text-primary-ink transition-transform duration-fast hover:-translate-y-0.5"
            >
              Search
            </button>
          </form>
        </Reveal>

        <p aria-live="polite" className="mt-6 text-sm text-ink-muted">
          {visible.length} {visible.length === 1 ? "Programme Area" : "Programme Areas"}
          {query ? ` matching “${params.q}”` : ""}.
        </p>

        {visible.length === 0 ? (
          <div className="mt-8 rounded-card border border-dashed border-hairline bg-surface/60 p-10 text-center">
            <p className="text-sm font-semibold text-ink">No matching Programme Areas found.</p>
            <p className="mt-1.5 text-sm text-ink-muted">Try adjusting your search terms to find what you are looking for.</p>
            {query && (
              <Link href="/programmes" className="mt-4 inline-flex text-sm font-semibold text-primary underline-offset-4 hover:underline">
                Clear the search
              </Link>
            )}
          </div>
        ) : (
          <ul className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((area, index) => (
              <Reveal key={area.id} delay={(index % 3) * 0.06}>
                <li className="h-full list-none">
                  <ProgrammeFieldTile field={area} href={`/programmes/${area.code}`} />
                </li>
              </Reveal>
            ))}
          </ul>
        )}

        <Reveal className="mt-16 flex flex-col items-start justify-between gap-6 rounded-hero border border-hairline bg-surface p-8 shadow-panel sm:flex-row sm:items-center sm:p-10">
          <div>
            <h2 className="text-xl font-bold text-ink">Looking for a specific training material?</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-muted">
              Open a Programme Area to see its Programme Fields. Publicly visible, published materials appear under a field
              when available; signed-in staff use the separate Library search.
            </p>
          </div>
          <Link
            href="/login"
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-[var(--radius-pill)] border border-primary/40 px-5 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-ink"
          >
            Sign in to the Library
          </Link>
        </Reveal>
      </section>
    </>
  );
}
