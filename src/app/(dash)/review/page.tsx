import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { ListEmptyState } from "@/components/ui/empty-state";
import { LiveRefresh } from "@/components/layout/live-refresh";
import { PageHeader } from "@/components/ui/page-header";
import { ReviewDecisionForm } from "@/components/authoring/version-actions";
import { formatDate, formatDateTime } from "@/lib/format";
import { countReviewQueue, listPendingTrainings, listReviewQueue } from "@/lib/server/authoring-queries";
import { requireRole } from "@/lib/server/rbac";
import { reviewScopeFor } from "@/lib/server/review-scope";

export const dynamic = "force-dynamic";

/**
 * Everything waiting for a decision, in one queue.
 *
 * Two kinds of work land here: a material version sent for review, and a training
 * filed by a facilitator. Both are decided the same way — by whoever holds the
 * programme area — so both are listed, and both are found by looking at the
 * assignments that exist now rather than at who was a reviewer when the item
 * arrived. That is what makes an appointment retroactive: appoint a unit head
 * today and every training already waiting in their field is on this page on
 * their first visit, however old it is.
 */
export default async function ReviewQueuePage() {
  // Reviewing is an administrator duty, or a unit head's for their own fields —
  // facilitators author material, they do not sign it off.
  const session = await requireRole(["SYSTEM_ADMIN", "FACILITATOR"]);
  if (session.role === "FACILITATOR" && !session.unitHead) {
    redirect("/dashboard");
  }

  const [queue, trainings, scope, waiting] = await Promise.all([
    listReviewQueue(session),
    listPendingTrainings(session),
    reviewScopeFor(session),
    countReviewQueue(session),
  ]);

  return (
    <div className="space-y-8">
      <LiveRefresh label="review queue" />

      <PageHeader
        eyebrow="Quality assurance"
        title="Review queue"
        description="Everything waiting for your decision: material versions sent for review, and trainings filed by facilitators. What you see is decided by the programme fields you hold — not by when the item arrived — so appointing a unit head brings everything already waiting with it. You cannot decide on something you uploaded yourself."
      />

      <div className="flex flex-wrap items-center gap-3">
        <Badge variant={waiting > 0 ? "warn" : "outline"}>
          {waiting === 0 ? "Nothing waiting" : `${waiting} waiting`}
        </Badge>
        <Link href="/authoring" className={buttonClass({ variant: "ghost" })}>
          Back to my materials
        </Link>
        <Link href="/trainings?review=PENDING" className={buttonClass({ variant: "ghost" })}>
          Open Trainings
        </Link>
      </div>

      {session.role === "FACILITATOR" && scope.empty && (
        <div className="rounded-card border border-warn/40 bg-warn/10 p-5 text-sm leading-relaxed text-ink">
          <p className="font-semibold">You are a unit head without a programme area yet.</p>
          <p className="mt-1 text-ink-muted">
            An administrator gives you a field — or one area inside it — from Users → Access. The moment that happens,
            everything already waiting in it appears here.
          </p>
        </div>
      )}

      <section aria-labelledby="trainings-heading" className="space-y-3">
        <div className="flex flex-wrap items-baseline gap-2">
          <h2 id="trainings-heading" className="text-lg font-bold text-ink">
            Trainings waiting
          </h2>
          <span className="text-sm text-ink-muted">
            {trainings.length === 0 ? "nothing to decide" : `${trainings.length} waiting`}
          </span>
        </div>

        {trainings.length === 0 ? (
          <p className="rounded-card border border-hairline bg-surface p-5 text-sm text-ink-muted">
            No training is waiting for a decision in your fields. A facilitator&apos;s entry arrives here the moment they
            file it.
          </p>
        ) : (
          <ul className="space-y-3">
            {trainings.map((training) => (
              <li
                key={training.id}
                className="rounded-card border border-hairline bg-surface p-5 shadow-panel"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="warn">Waiting</Badge>
                  <h3 className="text-sm font-bold text-ink">{training.title}</h3>
                  <span className="text-xs text-ink-muted">
                    {[training.fieldName, training.areaName].filter(Boolean).join(" · ")} · held{" "}
                    {formatDate(training.organisedOn)} · filed by {training.authorName}
                  </span>
                </div>
                <p className="mt-2 text-xs text-ink-muted">Last edited {formatDateTime(training.submittedAt)}</p>
                <Link
                  href={`/trainings/${training.id}`}
                  className="mt-3 inline-flex text-xs font-semibold text-primary hover:underline"
                >
                  Open it and decide
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="versions-heading" className="space-y-3">
        <div className="flex flex-wrap items-baseline gap-2">
          <h2 id="versions-heading" className="text-lg font-bold text-ink">
            Material versions waiting
          </h2>
          <span className="text-sm text-ink-muted">
            {queue.length === 0 ? "nothing to decide" : `${queue.length} in review`}
          </span>
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
                    <h3 className="text-sm font-bold text-ink">
                      {item.materialTitle} <span className="font-normal text-ink-muted">v{item.version}</span>
                    </h3>
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

                  <Link
                    href={`/authoring/${item.materialId}`}
                    className="mt-3 inline-block text-xs font-semibold text-primary hover:underline"
                  >
                    Open the full version history
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
