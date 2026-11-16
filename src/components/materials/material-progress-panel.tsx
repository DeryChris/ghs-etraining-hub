"use client";

import { useActionState } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { ProgressStatusChip } from "@/components/materials/progress-status-chip";
import { buttonClass } from "@/components/ui/button";
import { hintClass } from "@/components/ui/input";
import { formatCredits } from "@/lib/format";
import { updateMaterialProgressAction, type ProgressActionState } from "@/lib/server/actions/learning";
import type { ProgressStatus } from "@/lib/labels";

const INITIAL: ProgressActionState = { ok: false, message: null };

function Step({ done, children }: { done: boolean; children: React.ReactNode }) {
  const Icon = done ? CheckCircle2 : Circle;
  return (
    <li className="flex items-center gap-3 text-sm">
      <Icon className={`h-4 w-4 shrink-0 ${done ? "text-primary" : "text-ink-muted"}`} aria-hidden />
      <span className={done ? "text-ink" : "text-ink-muted"}>
        {children}
        <span className="sr-only">{done ? " (done)" : " (not yet done)"}</span>
      </span>
    </li>
  );
}

export function MaterialProgressPanel({
  materialId,
  status,
  requiresAcknowledgement,
  acknowledged,
  cpdCreditsX10,
}: {
  materialId: string;
  status: ProgressStatus;
  requiresAcknowledgement: boolean;
  acknowledged: boolean;
  cpdCreditsX10: number;
}) {
  const [state, formAction, pending] = useActionState(updateMaterialProgressAction, INITIAL);
  const needsAcknowledgement = requiresAcknowledgement && !acknowledged;
  const completed = status === "COMPLETED";
  const feedbackId = "progress-feedback";
  const hintId = "complete-hint";

  return (
    <section aria-labelledby="progress-heading" className="rounded-card border border-hairline bg-surface p-5 shadow-panel">
      <div className="flex items-center justify-between gap-3">
        <h2 id="progress-heading" className="text-base font-bold text-ink">
          Your progress
        </h2>
        <ProgressStatusChip status={status} />
      </div>

      <ol className="mt-4 space-y-3">
        <Step done={status !== "NOT_STARTED"}>Start the material</Step>
        {requiresAcknowledgement && <Step done={acknowledged}>Acknowledge this protocol</Step>}
        <Step done={completed}>Complete it and earn {formatCredits(cpdCreditsX10)}</Step>
      </ol>

      {completed ? (
        <p className="mt-5 rounded-control border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
          Completed and recorded. It is on your CPD transcript.
        </p>
      ) : (
        <form action={formAction} className="mt-5 space-y-3">
          <input type="hidden" name="materialId" value={materialId} />
          <div className="flex flex-col gap-2">
            {status === "NOT_STARTED" && (
              <button type="submit" name="intent" value="start" disabled={pending} aria-busy={pending} className={buttonClass({ variant: "secondary" })}>
                Start learning
              </button>
            )}
            {needsAcknowledgement && (
              <button type="submit" name="intent" value="acknowledge" disabled={pending} aria-busy={pending} className={buttonClass()}>
                I have read and acknowledge this protocol
              </button>
            )}
            <button
              type="submit"
              name="intent"
              value="complete"
              disabled={pending || needsAcknowledgement}
              aria-describedby={needsAcknowledgement ? hintId : undefined}
              aria-busy={pending}
              className={buttonClass({ variant: needsAcknowledgement ? "secondary" : "primary" })}
            >
              Mark complete
            </button>
            {needsAcknowledgement && (
              <p id={hintId} className={hintClass}>
                Acknowledge this protocol first. Completion unlocks after that.
              </p>
            )}
          </div>
        </form>
      )}

      <p id={feedbackId} role="status" aria-live="polite" className={state.message ? `mt-4 text-sm ${state.ok ? "text-primary" : "text-danger"}` : "sr-only"}>
        {state.message ?? ""}
      </p>
    </section>
  );
}
