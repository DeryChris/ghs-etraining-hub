import Link from "next/link";
import { ListEmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { listCategories } from "@/lib/server/learning-queries";
import { requireSession } from "@/lib/server/rbac";

export default async function DirectoratesPage() {
  const session = await requireSession();
  const categories = await listCategories(session);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="National training taxonomy"
        title="Directorates"
        description="Each directorate governs its own protocols, spaces and assessments. Choose one to see its spaces."
      />

      {categories.length === 0 ? (
        <ListEmptyState
          title="No directorates are published yet"
          description="System administrators publish directorates. Check back after your ICT team has set up the taxonomy."
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {categories.map((category) => (
            <li key={category.id}>
              <Link
                href={`/directorates/${category.id}`}
                className="group flex h-full flex-col rounded-card border border-hairline bg-surface p-5 shadow-panel transition-colors hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <span className="font-mono text-xs font-semibold tracking-wide text-ink-muted">{category.code}</span>
                <h2 className="mt-2 text-lg font-semibold leading-snug text-ink group-hover:text-primary">{category.name}</h2>
                {category.description && <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-muted">{category.description}</p>}
                <p className="mt-auto pt-4 text-xs font-semibold text-ink-muted">
                  {category.spaceCount} {category.spaceCount === 1 ? "space" : "spaces"} · {category.materialCount}{" "}
                  {category.materialCount === 1 ? "material" : "materials"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
