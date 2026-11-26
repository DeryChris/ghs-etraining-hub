"use client";

import { useActionState } from "react";
import { CheckCircle2, PenLine } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { acknowledgeMaterialAction, type AcknowledgementActionState } from "@/lib/server/actions/learning";

const INITIAL: AcknowledgementActionState = { ok: false, message: null };

/**
 * "I have read this version."
 *
 * The panel is deliberately one sentence and one button. There is nothing to
 * finish, no percentage to reach and no ordered steps: either this member of
 * staff has signed for the current version of the protocol or they have not.
 */
export function AcknowledgementPanel({
  materialId,
  acknowledged,
  versionChanged,
}: {
  materialId: string;
  acknowledged: boolean;
  /** Signed an older version: the signature stands, but it is out of date. */
  versionChanged: boolean;
}) {
  const [state, formAction, pending] = useActionState(acknowledgeMaterialAction, INITIAL);

  return (
    <section aria-labelledby="acknowledge-heading" className="rounded-card border border-hairline bg-surface p-5 shadow-panel">
      <h2 id="acknowledge-heading" className="flex items-center gap-2 text-base font-bold text-ink">
        <PenLine className="h-4 w-4 text-primary" aria-hidden />
        Acknowledgement
      </h2>

      {acknowledged ? (
        <p className="mt-3 flex items-start gap-2 rounded-control border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          You have acknowledged this version. The record keeps when, and which version you signed.
        </p>
      ) : (
        <>
          {versionChanged && (
            <p className="mt-3 text-sm leading-relaxed text-warn">
              You acknowledged an earlier version. A newer one has been published since.
            </p>
          )}
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">
            This protocol only needs a signature — read it, then confirm you have.
          </p>
          <form action={formAction} className="mt-4">
            <input type="hidden" name="materialId" value={materialId} />
            <button type="submit" disabled={pending} aria-busy={pending} className={buttonClass()}>
              I have read and acknowledge this protocol
            </button>
          </form>
        </>
      )}

      <p
        role="status"
        aria-live="polite"
        className={state.message ? `mt-4 text-sm ${state.ok ? "text-primary" : "text-danger"}` : "sr-only"}
      >
        {state.message ?? ""}
      </p>
    </section>
  );
}
