import Link from "next/link";
import { ListEmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { fieldHref } from "@/lib/links";
import { listFields } from "@/lib/server/learning-queries";
import { requireSession } from "@/lib/server/rbac";

export const metadata = { title: "Catalogue" };

/**
 * The catalogue: programme fields on top, areas inside them. This replaced the
 * directorate → space browser (ADR-0014) — same journey, one vocabulary, and the
 * counts now line up with the Trainings register because both read the same
 * fields and areas.
 */
export default async function CataloguePage() {
  const session = await requireSession();
  const fields = await listFields(session);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Programme taxonomy"
        title="Catalogue"
        description="Every programme field GHS trains in, and the areas inside it. A material is filed under an area; a training is recorded against one."
      />

      {fields.length === 0 ? (
        <ListEmptyState
          title="The programme taxonomy is empty"
          description="An administrator maintains the fields and areas at Administration → Programme fields. Materials appear here once they are published."
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {fields.map((field) => (
            <li key={field.id}>
              <Link
                href={fieldHref(field.code)}
                className="group flex h-full flex-col rounded-card border border-hairline bg-surface p-5 shadow-panel transition-colors hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <span className="font-mono text-xs font-semibold tracking-wide text-ink-muted">{field.code}</span>
                <h2 className="mt-2 text-lg font-semibold leading-snug text-ink group-hover:text-primary">{field.name}</h2>
                {field.description && <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-muted">{field.description}</p>}
                <p className="mt-auto pt-4 text-xs font-semibold text-ink-muted">
                  {field.areaCount} {field.areaCount === 1 ? "area" : "areas"} · {field.materialCount}{" "}
                  {field.materialCount === 1 ? "material" : "materials"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
