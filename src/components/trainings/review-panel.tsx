"use client";

import { useActionState, useState } from "react";
import { Check, Loader2, ShieldCheck, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { inputClass, labelClass } from "@/components/ui/input";
import { reviewTrainingAction, type ReviewActionState } from "@/lib/server/actions/trainings";

export type ReviewState = "PENDING" | "PUBLISHED" | "REJECTED";

const COPY: Record<ReviewState, { label: string; variant: "success" | "outline" | "danger"; sentence: string }> = {
  PUBLISHED: {
    label: "Live",
    variant: "success",
    sentence: "Approved for the whole service — it appears in Trainings for everyone.",
  },
  PENDING: {
    label: "Pending review",
    variant: "outline",
    sentence: "Waiting for a unit head assigned to this Programme Area or Programme Field. Only you and reviewers can see it.",
  },
  REJECTED: {
    label: "Returned for correction",
    variant: "danger",
    sentence:
      "A unit head returned this for correction. Correct what the note asks for and save — saving sends it back to them for review.",
  },
};

/**
 * The review banner for one training.
 *
 * Shown to everybody who can see the row, because "why is my training missing
 * from Trainings" is the question this answers. The approve/reject controls
 * appear only when the caller may actually review it.
 */
export function ReviewPanel({
  trainingId,
  title,
  reviewState,
  reviewNote,
  reviewedByName,
  canReview,
}: {
  trainingId: string;
  title: string;
  reviewState: ReviewState;
  reviewNote: string | null;
  reviewedByName: string | null;
  canReview: boolean;
}) {
  const [state, formAction, pending] = useActionState<ReviewActionState, FormData>(reviewTrainingAction, {
    ok: true,
    message: null,
  });
  const [decision, setDecision] = useState<"approve" | "reject">("approve");
  const copy = COPY[reviewState];

  if (reviewState === "PUBLISHED" && !canReview && !reviewedByName) return null;

  return (
    <section
      aria-labelledby="review-heading"
      className={`rounded-card border p-6 shadow-panel ${
        reviewState === "REJECTED"
          ? "border-danger/40 bg-danger/5"
          : reviewState === "PENDING"
            ? "border-warn/40 bg-warn/5"
            : "border-hairline bg-surface"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 id="review-heading" className="flex items-center gap-2 text-sm font-bold text-ink">
            <ShieldCheck className="h-4 w-4 text-primary" aria-hidden />
            Review
          </h2>
          <p className="max-w-[70ch] text-sm leading-relaxed text-ink-muted">{copy.sentence}</p>
          {reviewedByName && (
            <p className="text-xs text-ink-muted">
              {reviewState === "PUBLISHED" ? "Approved" : "Reviewed"} by {reviewedByName}.
            </p>
          )}
          {reviewNote && (
            <p className="mt-2 rounded-control border border-danger/30 bg-surface px-3 py-2 text-sm text-ink">
              <span className="font-semibold">Reviewer&apos;s note: </span>
              {reviewNote}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={copy.variant}>{copy.label}</Badge>

          {canReview && reviewState === "PENDING" && (
            <>
              <Dialog
                size="sm"
                title="Approve this training?"
                description={`“${title}” becomes visible to everyone in Trainings.`}
                trigger={({ open }) => (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setDecision("approve");
                      open();
                    }}
                  >
                    <Check className="h-4 w-4" aria-hidden />
                    Approve
                  </Button>
                )}
              >
                <ReviewForm
                  trainingId={trainingId}
                  decision="approve"
                  state={state}
                  formAction={formAction}
                  pending={pending}
                  submitLabel="Publish it"
                />
              </Dialog>

              <Dialog
                size="sm"
                title="Send it back"
                description="The facilitator keeps the record and is told what to change. Nothing is deleted."
                trigger={({ open }) => (
                  <Button
                    type="button"
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      setDecision("reject");
                      open();
                    }}
                  >
                    <Undo2 className="h-4 w-4" aria-hidden />
                    Send back
                  </Button>
                )}
              >
                <ReviewForm
                  trainingId={trainingId}
                  decision="reject"
                  state={state}
                  formAction={formAction}
                  pending={pending}
                  submitLabel="Send it back"
                  requireNote
                />
              </Dialog>
            </>
          )}
        </div>
      </div>

      {state.message && (
        <p
          role="status"
          className={`mt-4 text-sm font-medium ${state.ok ? "text-primary" : "text-danger"}`}
        >
          {state.message}
        </p>
      )}
      {/* Keeps the selected decision meaningful when both forms share one state. */}
      <input type="hidden" value={decision} readOnly aria-hidden tabIndex={-1} />
    </section>
  );
}

function ReviewForm({
  trainingId,
  decision,
  state,
  formAction,
  pending,
  submitLabel,
  requireNote,
}: {
  trainingId: string;
  decision: "approve" | "reject";
  state: ReviewActionState;
  formAction: (formData: FormData) => void;
  pending: boolean;
  submitLabel: string;
  requireNote?: boolean;
}) {
  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="trainingId" value={trainingId} />
      <input type="hidden" name="decision" value={decision} />

      <div>
        <label htmlFor={`review-note-${decision}`} className={labelClass}>
          {requireNote ? "What needs to change?" : "Note (optional)"}
        </label>
        <textarea
          id={`review-note-${decision}`}
          name="note"
          rows={3}
          required={requireNote}
          className={inputClass}
          placeholder={requireNote ? "e.g. check the recorded date" : ""}
        />
      </div>

      {state.message && !state.ok && (
        <p role="alert" className="text-sm text-danger">
          {state.message}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={pending} aria-busy={pending}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {submitLabel}
      </Button>
    </form>
  );
}
