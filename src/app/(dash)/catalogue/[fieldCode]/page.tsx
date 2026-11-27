import Link from "next/link";
import { notFound } from "next/navigation";
import { ListEmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { ProgrammeAreaTile } from "@/components/programme/programme-tile";
import { FieldTileIcon } from "@/components/ui/field-tile-icon";
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
              Library
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="text-ink">
            {field.name}
          </li>
        </ol>
      </nav>

      <PageHeader
        eyebrow={field.code}
        title={field.name}
        description={field.description ?? undefined}
        icon={<FieldTileIcon code={field.code} size={54} />}
      />

      <section aria-labelledby="areas-heading" className="space-y-4">
        <h2 id="areas-heading" className="text-lg font-bold text-ink">
          Programme Fields
        </h2>
        {areas.length === 0 ? (
          <ListEmptyState
            title="No Programme Fields in this Programme Area yet"
            description="An administrator maintains Programme Fields under Programme Areas at Administration → Programme Areas."
          />
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {areas.map((area) => (
              <li key={area.id} className="h-full">
                <ProgrammeAreaTile
                  area={area}
                  href={areaHref(field.code, area.code)}
                  meta={
                    <>
                      {area.trainingCount} {area.trainingCount === 1 ? "Training Session record" : "Training Session records"} ·{" "}
                      {area.materialCount} {area.materialCount === 1 ? "Training Material" : "Training Materials"}
                    </>
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
