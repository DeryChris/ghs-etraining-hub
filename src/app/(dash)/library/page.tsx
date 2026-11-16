import { MaterialCard } from "@/components/materials/material-card";
import { buttonClass } from "@/components/ui/button";
import { ListEmptyState } from "@/components/ui/empty-state";
import { inputClass, labelClass } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { MATERIAL_TYPES, MATERIAL_TYPE_LABELS, isMaterialType } from "@/lib/labels";
import { searchLibrary } from "@/lib/server/learning-queries";
import { requireSession } from "@/lib/server/rbac";

export default async function LibraryPage({ searchParams }: { searchParams: Promise<{ q?: string; type?: string }> }) {
  const session = await requireSession();
  const params = await searchParams;
  const query = (params.q ?? "").trim().slice(0, 120);
  const type = isMaterialType(params.type) ? params.type : null;

  const items = await searchLibrary({ query, type, viewer: session });
  const filtered = query.length > 0 || type !== null;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Published materials"
        title="Library"
        description="Every published SOP, video, lab and assessment you can access, across all directorates."
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
        Showing {items.length} {items.length === 1 ? "material" : "materials"}
        {filtered ? " for your filters" : ""}.
      </p>

      {items.length === 0 ? (
        <ListEmptyState
          title={filtered ? "No materials match those filters" : "The library is empty for now"}
          description={filtered ? "Try a shorter search, or choose All types." : "Published materials will appear here as directorates release them."}
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <li key={item.id}>
              <MaterialCard material={item} context={`${item.categoryName} · ${item.spaceTitle}`} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
