import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { ListEmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { ReviewDecisionForm } from "@/components/authoring/version-actions";
import { formatDateTime } from "@/lib/format";
import { listReviewQueue } from "@/lib/server/authoring-queries";
import { requireRole } from "@/lib/server/rbac";

export const dynamic = "force-dynamic";

export default async function ReviewQueuePage() {
  const session = await requireRole(["SYSTEM_ADMIN", "FACILITATOR"]);
  const queue = await listReviewQueue(session);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Quality assurance"
        title="Review queue"
        description="Versions waiting for a colleague's decision, limited to the programme areas you are assigned to. You cannot decide on a version you uploaded."
      />

      <div className="flex flex-wrap gap-3">
        <Link href="/authoring" className={buttonClass({ variant: "ghost" })}>
          Back to my materials
        </Link>
      </div>

      {queue.length === 0 ? (
        <ListEmptyState
          title="Nothing waiting"
          description="When a colleague sends a version for review it appears here, with the change note they wrote."
        />
      ) : (
        <ul className="space-y-4">
          {queue.map((item) => {
            const ownUpload = item.uploadedById === session.sub;
            return (
              <li key={item.versionId} className="rounded-card border border-hairline bg-surface p-5 shadow-panel">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="warn">In review</Badge>
                  <h2 className="text-sm font-bold text-ink">
                    {item.materialTitle} <span className="font-normal text-ink-muted">v{item.version}</span>
                  </h2>
                  <span className="text-xs text-ink-muted">
                    {item.fieldName} · uploaded by {item.uploadedByName} on {formatDateTime(item.uploadedAt)}
                  </span>
                </div>

                {item.changeNote && <p className="mt-2 text-sm text-ink-muted">“{item.changeNote}”</p>}

                <p className="mt-2 text-xs text-ink-muted">
                  {item.approvals > 0 ? `${item.approvals} approval on record.` : "No approval yet."}
                </p>

                <div className="mt-4 border-t border-hairline pt-4">
                  <ReviewDecisionForm materialId={item.materialId} versionId={item.versionId} ownUpload={ownUpload} />
                </div>

                <Link href={`/authoring/${item.materialId}`} className="mt-3 inline-block text-xs font-semibold text-primary hover:underline">
                  Open the full version history
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
