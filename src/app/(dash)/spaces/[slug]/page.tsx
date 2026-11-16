import Link from "next/link";
import { notFound } from "next/navigation";
import { MaterialCard } from "@/components/materials/material-card";
import { ListEmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { ProgressBar } from "@/components/ui/progress-bar";
import { MATERIAL_TYPES, MATERIAL_TYPE_LABELS } from "@/lib/labels";
import { getSpaceBySlug, listMaterialsInSpace } from "@/lib/server/learning-queries";
import { requireSession } from "@/lib/server/rbac";

export default async function SpacePage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await requireSession();
  const { slug } = await params;
  if (!/^[a-z0-9-]{1,100}$/.test(slug)) notFound();

  const found = await getSpaceBySlug(slug);
  if (!found) notFound();
  const { space, category } = found;

  const materials = await listMaterialsInSpace(space.id, session.sub);
  const completed = materials.filter((m) => m.status === "COMPLETED").length;
  const percent = materials.length > 0 ? (completed / materials.length) * 100 : 0;
  const groups = MATERIAL_TYPES.map((type) => ({ type, items: materials.filter((m) => m.type === type) })).filter(
    (group) => group.items.length > 0,
  );

  return (
    <div className="space-y-8">
      <nav aria-label="Breadcrumb" className="text-sm text-ink-muted">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link href="/directorates" className="hover:text-ink">
              Directorates
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link href={`/directorates/${category.id}`} className="hover:text-ink">
              {category.name}
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="text-ink">
            {space.title}
          </li>
        </ol>
      </nav>

      <PageHeader eyebrow={category.code} title={space.title} description={space.description ?? undefined} />

      <section aria-label="Space progress" className="rounded-card border border-hairline bg-surface p-5 shadow-panel">
        <p className="mb-3 text-sm font-semibold text-ink">
          {completed} of {materials.length} {materials.length === 1 ? "material" : "materials"} completed
        </p>
        <ProgressBar value={percent} label={`Completion in ${space.title}`} />
      </section>

      {materials.length === 0 ? (
        <ListEmptyState
          title="No published materials in this space yet"
          description="Facilitators publish SOPs, videos and labs here once they have been reviewed."
        />
      ) : (
        groups.map((group) => (
          <section key={group.type} aria-labelledby={`group-${group.type}`} className="space-y-4">
            <h2 id={`group-${group.type}`} className="text-lg font-bold text-ink">
              {MATERIAL_TYPE_LABELS[group.type]}s
            </h2>
            <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {group.items.map((material) => (
                <li key={material.id}>
                  <MaterialCard material={material} />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
