import Link from "next/link";
import { notFound } from "next/navigation";
import { AcknowledgementPanel } from "@/components/materials/acknowledgement-panel";
import { MaterialViewer } from "@/components/materials/material-viewer";
import { areaHref, fieldHref } from "@/lib/links";
import { ViewBeacon } from "@/components/materials/view-beacon";
import { PriorityChip } from "@/components/ui/priority-chip";
import { PageHeader } from "@/components/ui/page-header";
import { ListEmptyState } from "@/components/ui/empty-state";
import { formatDate, formatMinutes } from "@/lib/format";
import { previewKindFor } from "@/lib/ghs-constants";
import { readMaterialObject } from "@/lib/server/file-storage";
import { log } from "@/lib/server/logger";
import { readOfficePreview, type OfficePreview } from "@/lib/server/office-preview";
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

  const { material, area, field, authorName, version, progress } = detail;
  const signedVersion = progress?.materialVersionId ?? null;
  const acknowledged = progress?.acknowledgedAt != null && signedVersion === material.currentVersionId;
  const versionChanged = progress?.acknowledgedAt != null && signedVersion !== null && !acknowledged;
  const hasFile = Boolean(version?.storageKey);
  const noticeText = notice ? NOTICES[notice] : undefined;

  /*
   * Word, PowerPoint, Excel and text files are read here, because the browser
   * cannot render them. Everything else — PDF, image, video, audio — is handed
   * to the browser as a signed URL and never passes through this function.
   *
   * A failure to read is not a failure of the page: the viewer says so and the
   * download still works, which is the whole point of keeping the original.
   */
  const kind = previewKindFor(version?.mimeType);
  let office: OfficePreview | null = null;
  let text: string | null = null;
  let viewError: string | null = null;

  if (hasFile && version?.storageKey && (kind === "docx" || kind === "pptx" || kind === "xlsx" || kind === "text")) {
    const cap = kind === "text" ? 2 * 1024 * 1024 : 25 * 1024 * 1024;
    const object = await readMaterialObject(version.storageKey, cap);
    if (!object.ok) {
      viewError = "The stored file could not be read just now. The download link still works.";
      log.warn({ event: "material.preview_unavailable", materialId: id, reason: object.reason });
    } else if (kind === "text") {
      text = object.body.toString("utf8");
    } else {
      try {
        office = readOfficePreview(object.body, version.mimeType ?? "");
      } catch (error) {
        viewError = "This file could not be read in the page — it may be corrupt, or saved in a format this reader does not open. Download it to read.";
        log.warn({ event: "material.preview_failed", materialId: id, error: String(error) });
      }
    }
  }

  return (
    <div className="space-y-8">
      <ViewBeacon materialId={material.id} />
      <nav aria-label="Breadcrumb" className="text-sm text-ink-muted">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link href="/catalogue" className="hover:text-ink">
              Catalogue
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

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {hasFile ? (
            <MaterialViewer
              materialId={material.id}
              title={material.title}
              mimeType={version?.mimeType ?? null}
              sizeBytes={version?.sizeBytes ?? null}
              office={office}
              text={text}
              error={viewError}
            />
          ) : (
            <section aria-labelledby="file-heading" className="rounded-card border border-hairline bg-surface p-6 shadow-panel">
              <h2 id="file-heading" className="text-lg font-bold text-ink">
                No file attached to this version
              </h2>
              <ListEmptyState
                title="Nothing uploaded yet"
                description="Your facilitator will attach the document, slides, video or spreadsheet for this version. Marking it complete is still possible, and the record says which version you saw."
              />
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
                Your facilitator will sit this assessment with you. The result is recorded on the training, not here.
              </p>
            </section>
          )}
        </div>

        <aside className="space-y-4 lg:col-span-1">
          {material.requiresAcknowledgement && (
            <AcknowledgementPanel
              materialId={material.id}
              acknowledged={acknowledged}
              versionChanged={versionChanged}
            />
          )}
          <p className="text-xs leading-relaxed text-ink-muted">
            Opens and downloads are counted against your staff record for programme statistics. Nothing is graded, and nothing is awarded.
          </p>
        </aside>
      </div>
    </div>
  );
}
