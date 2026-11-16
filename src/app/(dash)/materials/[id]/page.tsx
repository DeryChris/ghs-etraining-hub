import Link from "next/link";
import { notFound } from "next/navigation";
import { MaterialProgressPanel } from "@/components/materials/material-progress-panel";
import { PriorityChip } from "@/components/ui/priority-chip";
import { PageHeader } from "@/components/ui/page-header";
import { buttonClass } from "@/components/ui/button";
import { ListEmptyState } from "@/components/ui/empty-state";
import { formatBytes, formatDate, formatMimeType, formatMinutes } from "@/lib/format";
import { isUuid } from "@/lib/ids";
import { MATERIAL_TYPE_LABELS, type ProgressStatus } from "@/lib/labels";
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

  const { material, space, category, authorName, version, progress } = detail;
  const status: ProgressStatus = progress?.status ?? "NOT_STARTED";
  const acknowledged = progress?.acknowledgedAt != null && progress.materialVersionId === material.currentVersionId;
  const hasFile = Boolean(version?.storageKey);
  const noticeText = notice ? NOTICES[notice] : undefined;

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
          <li>
            <Link href={`/spaces/${space.slug}`} className="hover:text-ink">
              {space.title}
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

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {material.type === "DOCUMENT" && (
            <section aria-labelledby="document-heading" className="space-y-4 rounded-card border border-hairline bg-surface p-6 shadow-panel">
              <h2 id="document-heading" className="text-lg font-bold text-ink">
                Controlled document
              </h2>
              {hasFile ? (
                <>
                  <p className="text-sm text-ink-muted">
                    {formatMimeType(version?.mimeType)}
                    {version?.sizeBytes ? ` · ${formatBytes(version.sizeBytes)}` : ""}
                    {version?.publishedAt ? ` · Published ${formatDate(version.publishedAt)}` : ""}. Opening and downloading are recorded in the audit trail.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <a href={`/api/materials/${material.id}/file`} target="_blank" rel="noopener noreferrer" className={buttonClass()}>
                      Open document
                    </a>
                    <a href={`/api/materials/${material.id}/file?download=1`} className={buttonClass({ variant: "secondary" })}>
                      Download
                    </a>
                  </div>
                </>
              ) : (
                <ListEmptyState title="No file attached to this version" description="Your facilitator will attach the controlled document for this version." />
              )}
            </section>
          )}

          {material.type === "VIDEO" && (
            <section aria-labelledby="video-heading" className="space-y-4 rounded-card border border-hairline bg-surface p-6 shadow-panel">
              <h2 id="video-heading" className="text-lg font-bold text-ink">
                Video
              </h2>
              {hasFile ? (
                <>
                  <video
                    controls
                    preload="none"
                    src={`/api/materials/${material.id}/file`}
                    aria-describedby="video-note"
                    className="aspect-video w-full rounded-card bg-black"
                  />
                  <p id="video-note" className="text-sm text-ink-muted">
                    The video does not start on its own. Captions are not yet available for this module.
                  </p>
                </>
              ) : (
                <ListEmptyState title="No video attached to this version" description="Your facilitator will attach the video for this version." />
              )}
            </section>
          )}

          {material.type === "LAB" && (
            <section aria-labelledby="lab-heading" className="space-y-3 rounded-card border border-hairline bg-surface p-6 shadow-panel">
              <h2 id="lab-heading" className="text-lg font-bold text-ink">
                Practical lab
              </h2>
              <p className="text-sm leading-relaxed text-ink-muted">
                This is a hands-on practical. Your facilitator runs it with you, in the facility or on the day of training. Complete the steps,
                then mark the material complete.
              </p>
            </section>
          )}

          {material.type === "ASSESSMENT_LINK" && (
            <section aria-labelledby="assessment-heading" className="space-y-3 rounded-card border border-hairline bg-surface p-6 shadow-panel">
              <h2 id="assessment-heading" className="text-lg font-bold text-ink">
                Assessment
              </h2>
              <p className="text-sm leading-relaxed text-ink-muted">
                Your facilitator will sit this assessment with you. Mark the material complete once you have passed.
              </p>
            </section>
          )}
        </div>

        <aside className="space-y-4 lg:col-span-1">
          <MaterialProgressPanel
            materialId={material.id}
            status={status}
            requiresAcknowledgement={material.requiresAcknowledgement}
            acknowledged={acknowledged}
            cpdCreditsX10={material.cpdCreditsX10}
          />
          <p className="text-xs leading-relaxed text-ink-muted">
            Your progress and CPD points are recorded against your staff record. Read-state and progress changes are kept for your transcript.
          </p>
        </aside>
      </div>
    </div>
  );
}
