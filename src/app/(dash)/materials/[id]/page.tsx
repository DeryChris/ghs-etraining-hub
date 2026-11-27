import Link from "next/link";
import { notFound } from "next/navigation";
import { MaterialViewer } from "@/components/materials/material-viewer";
import { areaHref, fieldHref } from "@/lib/links";
import { ViewBeacon } from "@/components/materials/view-beacon";
import { PriorityChip } from "@/components/ui/priority-chip";
import { PageHeader } from "@/components/ui/page-header";
import { ListEmptyState } from "@/components/ui/empty-state";
import { formatDate, formatMinutes } from "@/lib/format";
import { isUuid } from "@/lib/ids";
import { MATERIAL_TYPE_LABELS } from "@/lib/labels";
import { getMaterialDetail } from "@/lib/server/learning-queries";
import { requireSession } from "@/lib/server/rbac";

const NOTICES: Record<string, string> = {
  "file-unavailable":
    "We could not open this document. The file may have been replaced. Contact your facilitator, or try again in a few minutes.",
  "no-file": "This version has no file attached yet. Contact your facilitator.",
};

export default async function MaterialPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const { notice } = await searchParams;
  const detail = await getMaterialDetail(id, session);
  if (!detail) notFound();

  const { material, area, field, authorName, version } = detail;
  const hasFile = Boolean(version?.storageKey);
  const noticeText = notice ? NOTICES[notice] : undefined;

  return (
    <div className="space-y-8">
      <ViewBeacon materialId={material.id} />
      <nav aria-label="Breadcrumb" className="text-sm text-ink-muted">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link href="/catalogue" className="hover:text-ink">
              Library
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link href={fieldHref(field.code)} className="hover:text-ink">
              {field.name}
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link href={areaHref(field.code, area.code)} className="hover:text-ink">
              {area.name}
            </Link>
          </li>
        </ol>
      </nav>

      <PageHeader
        eyebrow={`${MATERIAL_TYPE_LABELS[material.type]} · Version ${version?.version ?? 1}`}
        title={material.title}
        description={material.summary ?? undefined}
      />

      {noticeText && (
        <p role="alert" className="rounded-control border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn">
          {noticeText}
        </p>
      )}

      <dl className="grid gap-4 rounded-card border border-hairline bg-surface p-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Author</dt>
          <dd className="mt-1 text-ink">{authorName}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Last updated</dt>
          <dd className="mt-1 text-ink">{formatDate(material.updatedAt)}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Estimated time</dt>
          <dd className="mt-1 text-ink">{material.estimatedMinutes !== null ? formatMinutes(material.estimatedMinutes) : "Not stated"}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Priority</dt>
          <dd className="mt-1">
            <PriorityChip priority={material.priority} />
          </dd>
        </div>
      </dl>

      <div className="space-y-6">
        {hasFile ? (
          <MaterialViewer
            materialId={material.id}
            title={material.title}
            mimeType={version?.mimeType ?? null}
            sizeBytes={version?.sizeBytes ?? null}
          />
        ) : (
          <section aria-labelledby="file-heading" className="rounded-card border border-hairline bg-surface p-6 shadow-panel">
            <h2 id="file-heading" className="text-lg font-bold text-ink">
              No file attached to this version
            </h2>
            <ListEmptyState
              title="Nothing uploaded yet"
              description="Your facilitator will attach the document, slides, video or spreadsheet for this version."
            />
          </section>
        )}

        {material.type === "LAB" && (
          <section aria-labelledby="lab-heading" className="space-y-3 rounded-card border border-hairline bg-surface p-6 shadow-panel">
            <h2 id="lab-heading" className="text-lg font-bold text-ink">
              Practical lab
            </h2>
            <p className="text-sm leading-relaxed text-ink-muted">
              This is a hands-on practical. Your facilitator runs it with you, in the facility or on the day of training — open this page
              when you are there to take part.
            </p>
          </section>
        )}

        {material.type === "ASSESSMENT_LINK" && (
          <section aria-labelledby="assessment-heading" className="space-y-3 rounded-card border border-hairline bg-surface p-6 shadow-panel">
            <h2 id="assessment-heading" className="text-lg font-bold text-ink">
              Pre/Post test
            </h2>
            <p className="text-sm leading-relaxed text-ink-muted">
              Your facilitator runs this test with you, in the room. The library keeps the paper, not the answers.
            </p>
          </section>
        )}

        <p className="text-xs leading-relaxed text-ink-muted">
          Opens and downloads are counted against your staff record for programme statistics.
        </p>
      </div>
    </div>
  );
}
