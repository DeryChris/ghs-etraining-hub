"use client";

import { useActionState } from "react";
import { Loader2, Send } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { inputClass } from "@/components/ui/input";
import { staffReplyAction, type ComplaintState } from "@/lib/server/actions/complaints";

const INITIAL: ComplaintState = { ok: false, message: null };

/**
 * "It is still not working" — the reply that used to require lodging a second
 * complaint. Needs the reference as well as the staff ID: the reference is the
 * thing only the person who filed it has.
 */
export function ComplaintReplyForm({ staffId, reference }: { staffId: string; reference: string }) {
  const [state, action, pending] = useActionState(staffReplyAction, INITIAL);

  return (
    <details className="mt-4 rounded-control border border-hairline bg-surface/70 p-4">
      <summary className="cursor-pointer text-sm font-semibold text-ink">
        {state.ok ? "Message sent — write again" : "Reply to this complaint"}
      </summary>
      <form action={action} className="mt-3 space-y-3">
        <input type="hidden" name="staffId" value={staffId} />
        <input type="hidden" name="reference" value={reference} />
        <label htmlFor={`reply-${reference}`} className="sr-only">
          Your message
        </label>
        <textarea
          id={`reply-${reference}`}
          name="body"
          rows={3}
          required
          minLength={2}
          placeholder="I tried the new password and it still says the details are not correct."
          className={inputClass}
        />
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={pending} aria-busy={pending} className={buttonClass({ size: "sm" })}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
            {pending ? "Sending…" : "Send message"}
          </button>
          <span className="text-xs text-ink-muted">Sending this reopens the complaint.</span>
        </div>
        {state.message && (
          <p role="status" className={`text-xs font-semibold ${state.ok ? "text-primary" : "text-danger"}`}>
            {state.message}
          </p>
        )}
      </form>
    </details>
  );
}
