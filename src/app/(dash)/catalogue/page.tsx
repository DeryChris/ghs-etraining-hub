import Link from "next/link";
import { BookOpen, Search } from "lucide-react";
import { MaterialCard } from "@/components/materials/material-card";
import { ListEmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { ProgrammeFieldTile } from "@/components/programme/programme-tile";
import { buttonClass } from "@/components/ui/button";
import { DataUnavailable } from "@/components/ui/data-unavailable";
import { inputClass, labelClass } from "@/components/ui/input";
import { fieldHref } from "@/lib/links";
import { MATERIAL_TYPES, MATERIAL_TYPE_LABELS, isMaterialType } from "@/lib/labels";
import { listFields, searchLibrary } from "@/lib/server/learning-queries";
import { mapLimit, withDeadline } from "@/lib/server/page-data";
import { requireSession } from "@/lib/server/rbac";

export const dynamic = "force-dynamic";

export const metadata = { title: "Library" };

/** Search results are paged like the old flat list; the browse view is not. */
const PAGE_SIZE = 24;

function searchHref(params: { q: string; type: string | null; page: number }): string {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.type) search.set("type", params.type);
  if (params.page > 1) search.set("page", String(params.page));
  const suffix = search.toString();
  return suffix ? `/catalogue?${suffix}` : "/catalogue";
}

/**
 * The library: programme field → programme area → the trainings and material
 * filed under it, with a search box for when you know what you want.
 *
 * This is where both former doors meet. "Catalogue" was the browse-by-programme
 * route and "Library" was a flat, searchable list of every material; two tabs that
 * answered "where is the malaria protocol?" between them, and nobody knew which
 * one to open. Searching happens here now: a query replaces the field tiles with
 * results, and clearing it brings the taxonomy back.
 */
export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; page?: string }>;
}) {
  const session = await requireSession();
  const params = await searchParams;

  const query = (params.q ?? "").trim().slice(0, 120);
  const type = isMaterialType(params.type) ? params.type : null;
  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const searching = query.length > 0 || type !== null;

  if (searching) {
    const results = await searchLibrary({
      query,
      type,
      viewer: session,
      page: Number.isFinite(requestedPage) ? requestedPage : 1,
    });
    const firstOnPage = results.total === 0 ? 0 : (results.page - 1) * PAGE_SIZE + 1;
    const lastOnPage = (results.page - 1) * PAGE_SIZE + results.items.length;

    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="Library"
          title={query ? `Results for “${query}”` : "Filtered material"}
          description="Every published protocol, video, lab and assessment you can reach, filed under its programme field and area."
          icon={<BookOpen className="h-7 w-7 text-primary" aria-hidden />}
          actions={
            <Link href="/catalogue" className={buttonClass({ variant: "ghost" })}>
              Browse by programme
            </Link>
          }
        />

        <SearchForm query={query} type={type} />

        <p aria-live="polite" className="text-sm text-ink-muted">
          {results.total === 0
            ? "No materials"
            : `Showing ${firstOnPage}–${lastOnPage} of ${results.total} ${results.total === 1 ? "material" : "materials"}`}
          {results.pageCount > 1 ? ` · page ${results.page} of ${results.pageCount}` : ""}.
        </p>

        {results.items.length === 0 ? (
          <ListEmptyState
            title="Nothing matches that search"
            description="Try a shorter word, or choose All types. The programmes themselves are one link away."
            actionText="Browse by programme"
            actionHref="/catalogue"
          />
        ) : (
          <>
            <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {results.items.map((item) => (
                <li key={item.id}>
                  <MaterialCard material={item} context={`${item.fieldName} · ${item.areaName}`} />
                </li>
              ))}
            </ul>

            {results.pageCount > 1 && (
              <nav aria-label="Library pages" className="flex items-center justify-between gap-4">
                {results.page > 1 ? (
                  <Link
                    href={searchHref({ q: query, type, page: results.page - 1 })}
                    rel="prev"
                    className={buttonClass({ variant: "secondary", className: "min-h-11" })}
                  >
                    Previous page
                  </Link>
                ) : (
                  <span />
                )}
                <p className="text-xs text-ink-muted">
                  Page {results.page} of {results.pageCount}
                </p>
                {results.page < results.pageCount ? (
                  <Link
                    href={searchHref({ q: query, type, page: results.page + 1 })}
                    rel="next"
                    className={buttonClass({ variant: "secondary", className: "min-h-11" })}
                  >
                    Next page
                  </Link>
                ) : (
                  <span />
                )}
              </nav>
            )}
          </>
        )}
      </div>
    );
  }

  const loaded = await withDeadline("catalogue.index", () => mapLimit([() => listFields(session)]));
  if (!loaded.ok) {
    return (
      <DataUnavailable
        title="The library did not load"
        description="The programme fields could not be read in time. Nothing was changed."
        requestId={loaded.requestId}
        hint={loaded.hint}
      />
    );
  }
  const [fields] = loaded.data;
  const trainings = fields.reduce((total, field) => total + field.trainingCount, 0);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Library"
        title="Programmes, areas and their trainings"
        description="Every programme field GHS trains in, with the areas inside it. Open a field, then an area, to see the trainings held for it and the material that goes with them."
        icon={<BookOpen className="h-7 w-7 text-primary" aria-hidden />}
        actions={
          <Link href="/trainings" className={buttonClass({ variant: "ghost" })}>
            Go to the register
          </Link>
        }
      />

      <SearchForm query="" type={null} />

      <p className="text-sm text-ink-muted">
        {fields.length} {fields.length === 1 ? "programme field" : "programme fields"} ·{" "}
        {trainings.toLocaleString("en-GB")} published {trainings === 1 ? "training" : "trainings"}
      </p>

      {fields.length === 0 ? (
        <ListEmptyState
          title="The programme taxonomy is empty"
          description="An administrator maintains the fields and areas at Administration → Programme fields. They appear here as soon as they are published."
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {fields.map((field) => (
            <li key={field.id}>
              <ProgrammeFieldTile field={field} href={fieldHref(field.code)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** One form for both views: submitting it switches to results, clearing it returns. */
function SearchForm({ query, type }: { query: string; type: string | null }) {
  return (
    <form
      action="/catalogue"
      method="get"
      role="search"
      className="grid gap-3 rounded-card border border-hairline bg-surface p-4 shadow-panel md:grid-cols-[1fr_200px_auto] md:items-end"
    >
      <div>
        <label htmlFor="library-q" className={labelClass}>
          Search the library
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden />
          <input
            id="library-q"
            name="q"
            type="search"
            defaultValue={query}
            placeholder="Title or summary"
            className={`${inputClass} pl-10`}
          />
        </div>
      </div>
      <div>
        <label htmlFor="library-type" className={labelClass}>
          Type
        </label>
        <select id="library-type" name="type" defaultValue={type ?? ""} className={inputClass}>
          <option value="">All types</option>
          {MATERIAL_TYPES.map((value) => (
            <option key={value} value={value}>
              {MATERIAL_TYPE_LABELS[value]}
            </option>
          ))}
        </select>
      </div>
      <button type="submit" className={buttonClass({ className: "w-full md:w-auto" })}>
        Search
      </button>
    </form>
  );
}
