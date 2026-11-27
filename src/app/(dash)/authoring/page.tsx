import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataUnavailable } from "@/components/ui/data-unavailable";
import { ListEmptyState } from "@/components/ui/empty-state";
import { LiveRefresh } from "@/components/layout/live-refresh";
import { PageHeader } from "@/components/ui/page-header";
import { NewDraftForm } from "@/components/authoring/new-draft-form";
import { materialStateBadge } from "@/components/authoring/state-badge";
import { formatDate } from "@/lib/format";
import { MATERIAL_TYPE_LABELS, PRIORITY_LABELS } from "@/lib/labels";
import { MATERIAL_STATE_LABELS } from "@/lib/material-workflow";
import { listAuthoringMaterials, listAuthoringAreas } from "@/lib/server/authoring-queries";
import { requireRole } from "@/lib/server/rbac";
import { mapLimit, withDeadline } from "@/lib/server/page-data";

export const dynamic = "force-dynamic";

export default async function AuthoringPage() {
  const session = await requireRole(["SYSTEM_ADMIN", "FACILITATOR"]);
  // Facilitators author and send for review; signing it off is an administrator or
  // unit-head duty, so the door is not offered to people who cannot walk through it.
  const canReview = session.role === "SYSTEM_ADMIN" || session.unitHead === true;
  const loaded = await withDeadline("authoring", () =>
    mapLimit([() => listAuthoringMaterials(session), () => listAuthoringAreas(session)]),
  );
  if (!loaded.ok) {
    return (
      <DataUnavailable
        title="Your materials did not load"
        description="Your drafts and programme areas could not be read in time. Nothing was changed."
        requestId={loaded.requestId}
      />
    );
  }
  const [materials, programmeAreas] = loaded.data;

  return (
    <div className="space-y-8">
      <LiveRefresh label="authoring" />

      <PageHeader
        eyebrow="Authoring"
        title="My materials"
        description="Draft, upload and track every version you are responsible for. A second person reviews each version before staff see it."
      />

      <div className="flex flex-wrap gap-3">
        {canReview && (
          <Link href="/review" className={buttonClass({ variant: "secondary" })}>
            Review queue
          </Link>
        )}
        <Link href="/catalogue" className={buttonClass({ variant: "ghost" })}>
          Browse published library
        </Link>
      </div>

      <section aria-labelledby="new-draft-heading" className="rounded-card border border-hairline bg-surface p-5 shadow-panel">
        <h2 id="new-draft-heading" className="text-base font-bold text-ink">
          New material
        </h2>
        <p className="mt-1 mb-4 text-sm text-ink-muted">
          Start with the details. You can upload the file on the next screen, then send it for review.
        </p>
        <NewDraftForm programmeAreas={programmeAreas} />
      </section>

      <section aria-labelledby="materials-heading" className="space-y-4">
        <h2 id="materials-heading" className="text-base font-bold text-ink">
          Materials you can edit
        </h2>

        {materials.length === 0 ? (
          <ListEmptyState
            title="Nothing here yet"
            description="Create a draft above. Materials appear here when they fall within your assigned Programme Areas or Programme Fields."
          />
        ) : (
          <ul className="space-y-3">
            {materials.map((material) => (
              <li key={material.id}>
                <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={materialStateBadge(material.state)}>{MATERIAL_STATE_LABELS[material.state]}</Badge>
                      <span className="text-xs text-ink-muted">
                        {MATERIAL_TYPE_LABELS[material.type]} · {PRIORITY_LABELS[material.priority]}
                      </span>
                    </div>
                    <p className="mt-2 truncate text-sm font-semibold text-ink">{material.title}</p>
                    <p className="mt-1 text-xs text-ink-muted">
                      {material.fieldName} · {material.areaName} · {material.versionCount} version
                      {material.versionCount === 1 ? "" : "s"}
                      {material.currentVersionNumber ? ` · published v${material.currentVersionNumber}` : ""} · updated{" "}
                      {formatDate(material.updatedAt)}
                    </p>
                  </div>
                  <Link href={`/authoring/${material.id}`} className={buttonClass({ variant: "secondary", size: "sm" })}>
                    Open
                  </Link>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
