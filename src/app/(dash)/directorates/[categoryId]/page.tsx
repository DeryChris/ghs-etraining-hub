import Link from "next/link";
import { notFound } from "next/navigation";
import { ListEmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { ProgressBar } from "@/components/ui/progress-bar";
import { isUuid } from "@/lib/ids";
import { getCategory, listSpacesInCategory } from "@/lib/server/learning-queries";
import { requireSession } from "@/lib/server/rbac";

export default async function DirectorateDetailPage({ params }: { params: Promise<{ categoryId: string }> }) {
  const session = await requireSession();
  const { categoryId } = await params;
  if (!isUuid(categoryId)) notFound();

  const category = await getCategory(categoryId);
  if (!category) notFound();

  const spaces = await listSpacesInCategory(category.id, session.sub);

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
          <li aria-current="page" className="text-ink">
            {category.name}
          </li>
        </ol>
      </nav>

      <PageHeader eyebrow={category.code} title={category.name} description={category.description ?? undefined} />

      <section aria-labelledby="spaces-heading" className="space-y-4">
        <h2 id="spaces-heading" className="text-lg font-bold text-ink">
          Spaces
        </h2>
        {spaces.length === 0 ? (
          <ListEmptyState
            title="No spaces in this directorate yet"
            description="Facilitators add spaces for each clinical unit or training module. Ask your directorate lead when they will be published."
          />
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {spaces.map((space) => {
              const percent = space.materialCount > 0 ? (space.completedCount / space.materialCount) * 100 : 0;
              return (
                <li key={space.id}>
                  <Link
                    href={`/spaces/${space.slug}`}
                    className="group flex h-full flex-col gap-4 rounded-card border border-hairline bg-surface p-5 shadow-panel transition-colors hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    <div>
                      <h3 className="text-base font-semibold text-ink group-hover:text-primary">{space.title}</h3>
                      {space.description && <p className="mt-1.5 line-clamp-2 text-sm text-ink-muted">{space.description}</p>}
                    </div>
                    <div className="mt-auto space-y-2">
                      <ProgressBar value={percent} label={`Completion in ${space.title}`} />
                      <p className="text-xs font-semibold text-ink-muted">
                        {space.completedCount} of {space.materialCount} {space.materialCount === 1 ? "material" : "materials"} completed
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
