"use client";

import { useActionState } from "react";
import { buttonClass } from "@/components/ui/button";
import { hintClass, inputClass, labelClass } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  archiveMaterialAction,
  publishVersionAction,
  recordReviewDecisionAction,
  submitForReviewAction,
  type AuthoringActionState,
} from "@/lib/server/actions/authoring";

const INITIAL: AuthoringActionState = { ok: false, message: null };

function Feedback({ state }: { state: AuthoringActionState }) {
  if (!state.message) return null;
  return (
    <p
      role={state.ok ? "status" : "alert"}
      className={`rounded-control border px-3 py-2 text-sm ${state.ok ? "border-primary/30 bg-primary/10 text-primary" : "border-danger/40 bg-danger/10 text-danger"}`}
    >
      {state.message}
    </p>
  );
}

/** Author sends a draft version into the review queue. */
export function SubmitForReviewForm({ materialId, versionId }: { materialId: string; versionId: string }) {
  const [state, formAction] = useActionState(submitForReviewAction, INITIAL);
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="materialId" value={materialId} />
      <input type="hidden" name="versionId" value={versionId} />
      <div>
        <label htmlFor={`review-note-${versionId}`} className={labelClass}>
          Note for the reviewer <span className="normal-case tracking-normal text-ink-muted">(optional)</span>
        </label>
        <input id={`review-note-${versionId}`} name="note" maxLength={500} className={inputClass} />
      </div>
      <Feedback state={state} />
      <SubmitButton pendingLabel="Sending…" variant="secondary">
        Send for review
      </SubmitButton>
    </form>
  );
}

/** A colleague records an approve/reject decision. */
export function ReviewDecisionForm({
  materialId,
  versionId,
  ownUpload,
}: {
  materialId: string;
  versionId: string;
  ownUpload: boolean;
}) {
  const [state, formAction] = useActionState(recordReviewDecisionAction, INITIAL);

  if (ownUpload) {
    return (
      <p className="rounded-control border border-hairline bg-surface-2 px-3 py-2 text-sm text-ink-muted">
        You uploaded this version. The two-person rule means a colleague must review and publish it.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="materialId" value={materialId} />
      <input type="hidden" name="versionId" value={versionId} />
      <div>
        <label htmlFor={`review-comment-${versionId}`} className={labelClass}>
          Comment
        </label>
        <textarea
          id={`review-comment-${versionId}`}
          name="comment"
          rows={2}
          maxLength={1000}
          className={inputClass}
          aria-describedby={`review-comment-hint-${versionId}`}
        />
        <p id={`review-comment-hint-${versionId}`} className={hintClass}>
          Required if you reject it.
        </p>
      </div>
      <Feedback state={state} />
      <div className="flex flex-wrap gap-2">
        <button type="submit" name="decision" value="APPROVED" className={buttonClass()}>
          Approve
        </button>
        <button type="submit" name="decision" value="REJECTED" className={buttonClass({ variant: "danger" })}>
          Send back to author
        </button>
      </div>
    </form>
  );
}

export function PublishVersionForm({
  materialId,
  versionId,
  canOverride,
}: {
  materialId: string;
  versionId: string;
  canOverride: boolean;
}) {
  const [state, formAction] = useActionState(publishVersionAction, INITIAL);
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="materialId" value={materialId} />
      <input type="hidden" name="versionId" value={versionId} />
      {canOverride && (
        <div>
          <label htmlFor={`override-${versionId}`} className={labelClass}>
            Override reason <span className="normal-case tracking-normal text-ink-muted">(administrators only)</span>
          </label>
          <input id={`override-${versionId}`} name="overrideReason" maxLength={500} className={inputClass} />
          <p className={hintClass}>
            Leave empty unless you are deliberately publishing without a second approver. The reason is recorded in the
            audit trail.
          </p>
        </div>
      )}
      <Feedback state={state} />
      <SubmitButton pendingLabel="Publishing…">Publish to learners</SubmitButton>
    </form>
  );
}

export function ArchiveMaterialForm({ materialId }: { materialId: string }) {
  const [state, formAction] = useActionState(archiveMaterialAction, INITIAL);
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="materialId" value={materialId} />
      <div>
        <label htmlFor={`archive-reason-${materialId}`} className={labelClass}>
          Reason <span className="normal-case tracking-normal text-ink-muted">(optional)</span>
        </label>
        <input id={`archive-reason-${materialId}`} name="reason" maxLength={500} className={inputClass} />
      </div>
      <Feedback state={state} />
      <SubmitButton pendingLabel="Archiving…" variant="danger">
        Archive material
      </SubmitButton>
    </form>
  );
}
