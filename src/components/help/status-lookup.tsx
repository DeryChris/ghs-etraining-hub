"use client";

import Link from "next/link";
import { useActionState } from "react";
import { CheckCircle2, Clock3, Loader2, MessageSquareWarning, Search } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { hintClass, inputClass, labelClass } from "@/components/ui/input";
import { ComplaintReplyForm } from "@/components/help/complaint-reply";
import { COMPLAINT_ISSUE_LABELS, COMPLAINT_STATUS_LABELS, type ComplaintIssue } from "@/lib/labels";
import { lookupComplaintsAction, type StatusLookupState } from "@/lib/server/actions/complaints";

const INITIAL: StatusLookupState = { ok: false, message: null };

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const TONE: Record<string, string> = {
  SUBMITTED: "border-accent/50 bg-accent/10 text-ink",
  IN_PROGRESS: "border-primary/40 bg-primary/10 text-primary",
  RESOLVED: "border-primary/40 bg-primary/[0.07] text-ink",
};

/** Staff ID → the complaints lodged under it, with the answer written against each. */
export function StatusLookup() {
  const [state, action, pending] = useActionState(lookupComplaintsAction, INITIAL);

  return (
    <div className="space-y-8">
      <form action={action} className="rounded-card border border-hairline bg-surface p-6 shadow-panel sm:p-7">
        <label htmlFor="staffId" className={labelClass}>
          Staff ID
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="staffId"
            name="staffId"
            inputMode="numeric"
            autoComplete="off"
            required
            placeholder="1587583"
            className={inputClass}
          />
          <button
            type="submit"
            disabled={pending}
            aria-busy={pending}
            className={buttonClass({ className: "shrink-0 sm:w-40" })}
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Search className="h-4 w-4" aria-hidden />}
            {pending ? "Checking…" : "Check status"}
          </button>
        </div>
        <p className={hintClass}>The number you lodged the complaint under — the same one on your payslip.</p>
      </form>

      {state.message && (
        <div className="rounded-card border border-hairline bg-surface-2/60 p-6">
          <p className="text-sm leading-relaxed text-ink-muted">{state.message}</p>
          {!state.ok && (
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/help/report" className={buttonClass({ variant: "primary", size: "sm" })}>
                <MessageSquareWarning className="h-4 w-4" aria-hidden />
                Lodge a complaint
              </Link>
              <Link href="/help" className={buttonClass({ variant: "ghost", size: "sm" })}>
                Back to the Complaint Hub
              </Link>
            </div>
          )}
        </div>
      )}

      {state.results && state.results.length > 0 && (
        <ul className="space-y-4">
          {state.results.map((item) => (
            <li key={item.reference} className={`rounded-card border p-6 ${TONE[item.status] ?? "border-hairline bg-surface"}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-xs font-bold tracking-wide text-ink-muted">{item.reference}</p>
                  <h2 className="mt-1 text-lg font-bold text-ink">{item.subject}</h2>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {COMPLAINT_ISSUE_LABELS[item.issueType as ComplaintIssue]} · lodged {formatWhen(item.createdAt)}
                    {item.resolvedAt ? ` · resolved ${formatWhen(item.resolvedAt)}` : ""}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-current/30 px-3 py-1 text-xs font-bold">
                  {item.status === "RESOLVED" ? (
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                  ) : (
                    <Clock3 className="h-3.5 w-3.5" aria-hidden />
                  )}
                  {COMPLAINT_STATUS_LABELS[item.status]}
                </span>
              </div>
              {item.response ? (
                <div className="mt-4 rounded-control border-l-2 border-primary bg-surface/80 px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">HR response</p>
                  <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink">{item.response}</p>
                </div>
              ) : (
                <p className="mt-4 text-sm text-ink-muted">
                  No answer yet. It is with the administrator handling access complaints.
                </p>
              )}
              {state.staffId && <ComplaintReplyForm staffId={state.staffId} reference={item.reference} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
