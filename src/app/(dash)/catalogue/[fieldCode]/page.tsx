import Link from "next/link";
import { notFound } from "next/navigation";
import { ListEmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { ProgressBar } from "@/components/ui/progress-bar";
import { areaHref } from "@/lib/links";
import { getFieldByCode, listAreasInField } from "@/lib/server/learning-queries";
import { requireSession } from "@/lib/server/rbac";

export default async function FieldPage({ params }: { params: Promise<{ fieldCode: string }> }) {
  const session = await requireSession();
  const { fieldCode } = await params;
  const code = decodeURIComponent(fieldCode);
  if (!/^[A-Za-z0-9-]{1,24}$/.test(code)) notFound();

  const field = await getFieldByCode(code, session);
  if (!field) notFound();

  const areas = await listAreasInField(field.id, session);

  return (
    <div className="space-y-8">
      <nav aria-label="Breadcrumb" className="text-sm text-ink-muted">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link href="/catalogue" className="hover:text-ink">
              Catalogue
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="text-ink">
            {field.name}
          </li>
        </ol>
      </nav>

      <PageHeader eyebrow={field.code} title={field.name} description={field.description ?? undefined} />

      <section aria-labelledby="areas-heading" className="space-y-4">
        <h2 id="areas-heading" className="text-lg font-bold text-ink">
          Programme areas
        </h2>
        {areas.length === 0 ? (
          <ListEmptyState
            title="No areas in this field yet"
            description="An administrator adds the areas at Administration → Programme fields. A training cannot be filed under this field until it has one."
          />
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {areas.map((area) => {
              const percent = area.materialCount > 0 ? (area.completedCount / area.materialCount) * 100 : 0;
              return (
                <li key={area.id}>
                  <Link
                    href={areaHref(field.code, area.code)}
                    className="group flex h-full flex-col gap-4 rounded-card border border-hairline bg-surface p-5 shadow-panel transition-colors hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    <div>
                      <span className="font-mono text-[11px] font-semibold tracking-wide text-ink-muted">{area.code}</span>
                      <h3 className="mt-1 text-base font-semibold text-ink group-hover:text-primary">{area.name}</h3>
                      {area.description && <p className="mt-1.5 line-clamp-2 text-sm text-ink-muted">{area.description}</p>}
                    </div>
                    <div className="mt-auto space-y-2">
                      <ProgressBar value={percent} label={`Completion in ${area.name}`} />
                      <p className="text-xs font-semibold text-ink-muted">
                        {area.completedCount} of {area.materialCount} {area.materialCount === 1 ? "material" : "materials"} completed
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
