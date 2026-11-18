import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import {
  ArchiveMaterialForm,
  PublishVersionForm,
  ReviewDecisionForm,
  SubmitForReviewForm,
} from "@/components/authoring/version-actions";
import { materialStateBadge } from "@/components/authoring/state-badge";
import { UploadVersionForm } from "@/components/authoring/upload-version-form";
import { formatBytes, formatDateTime } from "@/lib/format";
import { isUuid } from "@/lib/ids";
import { MATERIAL_TYPE_LABELS, PRIORITY_LABELS } from "@/lib/labels";
import { MATERIAL_STATE_LABELS, publishBlockers } from "@/lib/material-workflow";
import { getAuthoringMaterial } from "@/lib/server/authoring-queries";
import { requireRole } from "@/lib/server/rbac";

export const dynamic = "force-dynamic";

export default async function AuthoringMaterialPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole(["SYSTEM_ADMIN", "FACILITATOR"]);
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const material = await getAuthoringMaterial(id, session);
  if (!material) notFound();

  const canOverride = session.role === "SYSTEM_ADMIN";
  const archived = material.state === "ARCHIVED";

  return (
    <div className="space-y-8">
      <nav aria-label="Breadcrumb" className="text-sm text-ink-muted">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link href="/authoring" className="hover:text-ink">
              My materials
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="text-ink">
            {material.title}
          </li>
        </ol>
      </nav>

      <PageHeader
        eyebrow={`${material.fieldName} · ${material.areaName}`}
        title={material.title}
        description={material.summary ?? undefined}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={materialStateBadge(material.state)}>{MATERIAL_STATE_LABELS[material.state]}</Badge>
        <Badge variant="outline">{MATERIAL_TYPE_LABELS[material.type]}</Badge>
        <Badge variant="outline">{PRIORITY_LABELS[material.priority]} priority</Badge>
        <span className="text-xs text-ink-muted">Author: {material.authorName}</span>
        {material.state === "PUBLISHED" && (
          <Link href={`/programmeAreas/${material.areaCode}`} className="text-xs font-semibold text-primary hover:underline">
            View in learner library
          </Link>
        )}
      </div>

      {archived ? (
        <p className="rounded-card border border-danger/30 bg-danger/5 p-5 text-sm text-ink-muted">
          This material is archived. It no longer appears to learners, and its history is kept for audit.
        </p>
      ) : (
        <section aria-labelledby="upload-heading" className="rounded-card border border-hairline bg-surface p-5 shadow-panel">
          <h2 id="upload-heading" className="text-base font-bold text-ink">
            Upload a new version
          </h2>
          <p className="mt-1 mb-4 text-sm text-ink-muted">
            A new version starts as a draft. It becomes visible to learners only after a colleague approves it and someone
            publishes it.
          </p>
          <UploadVersionForm materialId={material.id} />
        </section>
      )}

      <section aria-labelledby="versions-heading" className="space-y-4">
        <h2 id="versions-heading" className="text-base font-bold text-ink">
          Version history
        </h2>

        {material.versions.length === 0 ? (
          <p className="rounded-control border border-dashed border-hairline bg-surface/60 px-4 py-8 text-center text-sm text-ink-muted">
            No file has been uploaded yet. Upload the first version above.
          </p>
        ) : (
          <ul className="space-y-4">
            {material.versions.map((version) => {
              const approvals = version.reviews.filter(
                (review) => review.decision === "APPROVED" && review.reviewerId !== version.uploadedById,
              );
              const ownUpload = version.uploadedById === session.sub;
              const blockers = publishBlockers({
                versionState: version.state,
                uploadedById: version.uploadedById,
                publisherId: session.sub,
                publisherRole: session.role,
                approvals,
                overrideReason: null,
              });
              const isCurrent = material.currentVersionId === version.id;

              return (
                <li key={version.id} className="rounded-card border border-hairline bg-surface p-5 shadow-panel">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold text-ink">Version {version.version}</h3>
                    <Badge variant={materialStateBadge(version.state)}>{MATERIAL_STATE_LABELS[version.state]}</Badge>
                    {isCurrent && <Badge variant="success">Live</Badge>}
                    <span className="text-xs text-ink-muted">
                      {formatBytes(version.sizeBytes)} · uploaded by {version.uploadedByName} on{" "}
                      {formatDateTime(version.createdAt)}
                    </span>
                  </div>

                  {version.changeNote && <p className="mt-2 text-sm text-ink-muted">“{version.changeNote}”</p>}

                  {version.reviews.length > 0 && (
                    <ul className="mt-3 space-y-1 text-xs text-ink-muted">
                      {version.reviews.map((review) => (
                        <li key={`${review.reviewerId}-${review.createdAt.toISOString()}`}>
                          <span className={review.decision === "APPROVED" ? "text-ghs-green" : "text-danger"}>
                            {review.decision === "APPROVED" ? "Approved" : "Returned"}
                          </span>{" "}
                          by {review.reviewerName} · {formatDateTime(review.createdAt)}
                          {review.comment ? ` — ${review.comment}` : ""}
                        </li>
                      ))}
                    </ul>
                  )}

                  {!archived && (
                    <div className="mt-4 space-y-3 border-t border-hairline pt-4">
                      {version.state === "DRAFT" && <SubmitForReviewForm materialId={material.id} versionId={version.id} />}

                      {version.state === "IN_REVIEW" && (
                        <div className="space-y-4">
                          <ReviewDecisionForm materialId={material.id} versionId={version.id} ownUpload={ownUpload} />
                          {blockers.length === 0 || canOverride ? (
                            <div className="rounded-control border border-hairline bg-surface-2 p-4">
                              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                                Publish
                              </p>
                              <PublishVersionForm materialId={material.id} versionId={version.id} canOverride={canOverride} />
                            </div>
                          ) : (
                            <p className="text-xs text-ink-muted">{blockers.join(" ")}</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {!archived && (
        <section aria-labelledby="archive-heading" className="rounded-card border border-danger/30 bg-danger/5 p-5">
          <h2 id="archive-heading" className="text-base font-bold text-ink">
            Archive this material
          </h2>
          <p className="mt-1 mb-4 text-sm text-ink-muted">
            Archiving withdraws it from learners. The versions and audit entries stay for inspection.
          </p>
          <ArchiveMaterialForm materialId={material.id} />
        </section>
      )}
    </div>
  );
}
