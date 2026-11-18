import Link from "next/link";
import { MaterialCard } from "@/components/materials/material-card";
import { buttonClass } from "@/components/ui/button";
import { ListEmptyState } from "@/components/ui/empty-state";
import { inputClass, labelClass } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { MATERIAL_TYPES, MATERIAL_TYPE_LABELS, isMaterialType } from "@/lib/labels";
import { searchLibrary } from "@/lib/server/learning-queries";
import { requireSession } from "@/lib/server/rbac";

function pageHref(params: { q: string; type: string | null; page: number }): string {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.type) search.set("type", params.type);
  if (params.page > 1) search.set("page", String(params.page));
  const suffix = search.toString();
  return suffix ? `/library?${suffix}` : "/library";
}

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

  const { items, total, page, pageCount } = await searchLibrary({
    query,
    type,
    viewer: session,
    page: Number.isFinite(requestedPage) ? requestedPage : 1,
  });
  const filtered = query.length > 0 || type !== null;
  const firstOnPage = total === 0 ? 0 : (page - 1) * 24 + 1;
  const lastOnPage = (page - 1) * 24 + items.length;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Published materials"
        title="Library"
        description="Every published SOP, video, lab and assessment you can access, across all directorates."
        actions={
          <Link href="/directorates" className={buttonClass({ variant: "ghost" })}>
            Browse by programme
          </Link>
        }
      />

      <form action="/library" method="get" role="search" className="grid gap-3 rounded-card border border-hairline bg-surface p-4 md:grid-cols-[1fr_220px_auto] md:items-end">
        <div>
          <label htmlFor="library-q" className={labelClass}>
            Search
          </label>
          <input id="library-q" name="q" type="search" defaultValue={query} placeholder="Title or summary" className={inputClass} />
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
          Apply filters
        </button>
      </form>

      <p aria-live="polite" className="text-sm text-ink-muted">
        {total === 0
          ? "No materials"
          : `Showing ${firstOnPage}–${lastOnPage} of ${total} ${total === 1 ? "material" : "materials"}`}
        {filtered ? " for your filters" : ""}
        {pageCount > 1 ? ` · page ${page} of ${pageCount}` : ""}.
      </p>

      {items.length === 0 ? (
        <ListEmptyState
          title={filtered ? "No materials match those filters" : "The library is empty for now"}
          description={filtered ? "Try a shorter search, or choose All types." : "Published materials will appear here as directorates release them."}
        />
      ) : (
        <>
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <li key={item.id}>
                <MaterialCard material={item} context={`${item.categoryName} · ${item.spaceTitle}`} />
              </li>
            ))}
          </ul>

          {pageCount > 1 && (
            <nav aria-label="Library pages" className="flex items-center justify-between gap-4">
              {page > 1 ? (
                <Link
                  href={pageHref({ q: query, type, page: page - 1 })}
                  rel="prev"
                  className={buttonClass({ variant: "secondary", className: "min-h-11" })}
                >
                  Previous page
                </Link>
              ) : (
                <span />
              )}
              <p className="text-xs text-ink-muted">
                Page {page} of {pageCount}
              </p>
              {page < pageCount ? (
                <Link
                  href={pageHref({ q: query, type, page: page + 1 })}
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
