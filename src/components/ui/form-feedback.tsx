"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

/**
 * The answer to "did that work?"
 *
 * Server actions return a message and the form printed it at the bottom of a long
 * page, which on a phone is off-screen and on a desktop is below the fold — so a
 * saved training and a failed one looked the same: nothing happened. This is the
 * reply, placed next to the submit button, announced to screen readers, and
 * scrolled to the moment it appears.
 */
export function FormFeedback({
  state,
  pending,
  pendingMessage = "Saving…",
  keepNote = true,
}: {
  state: { ok: boolean; message: string | null };
  pending?: boolean;
  pendingMessage?: string;
  /** Say that the answers are still there, because that was the other complaint. */
  keepNote?: boolean;
}) {
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!pending && !state.message) return;
    ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [pending, state.message, state.ok]);

  if (pending) {
    return (
      <p
        ref={ref}
        role="status"
        className="flex items-start gap-2 rounded-control border border-primary/30 bg-primary/10 px-4 py-3 text-sm font-medium text-primary"
      >
        <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" aria-hidden />
        {pendingMessage} Keep this page open until it finishes.
      </p>
    );
  }

  if (!state.message) return null;

  return (
    <p
      ref={ref}
      role={state.ok ? "status" : "alert"}
      aria-live={state.ok ? "polite" : "assertive"}
      className={`flex items-start gap-2 rounded-control border px-4 py-3 text-sm font-medium ${
        state.ok ? "border-primary/30 bg-primary/10 text-primary" : "border-danger/40 bg-danger/10 text-danger"
      }`}
    >
      {state.ok ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      ) : (
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      )}
      <span>
        {state.message}
        {!state.ok && keepNote && (
          <span className="mt-1 block text-xs font-normal">Nothing you typed was cleared — fix the field and submit again.</span>
        )}
      </span>
    </p>
  );
}
