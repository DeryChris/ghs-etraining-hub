"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, Copy, KeyRound, Loader2, MessageSquareReply, Phone, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { inputClass, labelClass } from "@/components/ui/input";
import {
  COMPLAINT_ISSUE_LABELS,
  COMPLAINT_STATUS_LABELS,
  type ComplaintIssue,
  type ComplaintStatus,
} from "@/lib/labels";
import {
  resetAccessAction,
  respondToComplaintAction,
  type ComplaintState,
} from "@/lib/server/actions/complaints";

const INITIAL: ComplaintState = { ok: false, message: null };

export interface ComplaintCardData {
  id: string;
  reference: string;
  staffId: string | null;
  fullName: string;
  email: string;
  phone: string | null;
  region: string | null;
  facility: string | null;
  issueType: ComplaintIssue;
  subject: string;
  description: string;
  status: ComplaintStatus;
  response: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * One complaint, with the two things an administrator can do about it: answer it,
 * or reset the person's access. Reset returns a temporary password once — it is
 * shown here and nowhere else, with a copy button, because the usual way it
 * travels is somebody reading it down a phone.
 */
export function ComplaintCard({ complaint }: { complaint: ComplaintCardData }) {
  const [replyState, replyAction, replyPending] = useActionState(respondToComplaintAction, INITIAL);
  const [resetState, resetAction, resetPending] = useActionState(resetAccessAction, INITIAL);
  const [showReset, setShowReset] = useState(false);
  const [copied, setCopied] = useState(false);

  const closed = complaint.status === "RESOLVED";

  async function copyCredentials() {
    if (!resetState.credentials) return;
    const text = `Email: ${resetState.credentials.email}\nTemporary password: ${resetState.credentials.password}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <li className="rounded-card border border-hairline bg-surface p-5 shadow-panel sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[11px] font-bold tracking-wide text-ink-muted">{complaint.reference}</p>
          <h3 className="mt-1 text-lg font-bold leading-snug text-ink">{complaint.subject}</h3>
          <p className="mt-1 text-sm text-ink-muted">
            {complaint.fullName}
            {complaint.staffId ? ` · Staff ID ${complaint.staffId}` : " · no Staff ID given"}
          </p>
          <p className="text-xs text-ink-muted">
            {[complaint.region, complaint.facility].filter(Boolean).join(" · ")}
            {complaint.region || complaint.facility ? " · " : ""}
            {formatWhen(complaint.createdAt)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge variant={closed ? "success" : complaint.status === "IN_PROGRESS" ? "default" : "warn"}>
            {COMPLAINT_STATUS_LABELS[complaint.status]}
          </Badge>
          <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
            {COMPLAINT_ISSUE_LABELS[complaint.issueType]}
          </span>
        </div>
      </div>

      <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-ink">{complaint.description}</p>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-muted">
        <a href={`mailto:${complaint.email}`} className="inline-flex items-center gap-1.5 hover:text-ink hover:underline">
          <Mail className="h-3.5 w-3.5" aria-hidden />
          {complaint.email}
        </a>
        {complaint.phone && (
          <a href={`tel:${complaint.phone.replace(/\s+/g, "")}`} className="inline-flex items-center gap-1.5 hover:text-ink hover:underline">
            <Phone className="h-3.5 w-3.5" aria-hidden />
            {complaint.phone}
          </a>
        )}
      </div>

      {complaint.response && (
        <div className="mt-4 rounded-control border-l-2 border-primary bg-surface-2/60 px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">Sent to the person</p>
          <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink">{complaint.response}</p>
          {complaint.resolvedAt && (
            <p className="mt-1 text-xs text-ink-muted">Resolved {formatWhen(complaint.resolvedAt)}</p>
          )}
        </div>
      )}

      {resetState.credentials && (
        <div className="mt-4 rounded-control border border-accent/50 bg-accent/10 p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-ink">
            <KeyRound className="h-4 w-4" aria-hidden />
            New access details — shown once
          </p>
          <dl className="mt-2 space-y-1 font-mono text-sm text-ink">
            <div>
              <dt className="inline font-sans text-xs font-semibold uppercase tracking-wide text-ink-muted">Email </dt>
              <dd className="inline">{resetState.credentials.email}</dd>
            </div>
            <div>
              <dt className="inline font-sans text-xs font-semibold uppercase tracking-wide text-ink-muted">Password </dt>
              <dd className="inline">{resetState.credentials.password}</dd>
            </div>
          </dl>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={copyCredentials} className={buttonClass({ variant: "secondary", size: "sm" })}>
              <Copy className="h-3.5 w-3.5" aria-hidden />
              {copied ? "Copied" : "Copy both"}
            </button>
            <span className="self-center text-xs text-ink-muted">
              Read it to them, then ask them to change it on first sign-in.
            </span>
          </div>
        </div>
      )}

      {(replyState.message || resetState.message) && (
        <p
          role="status"
          className={`mt-4 rounded-control border px-4 py-3 text-sm font-medium ${
            replyState.ok || resetState.ok
              ? "border-primary/30 bg-primary/10 text-primary"
              : "border-danger/40 bg-danger/10 text-danger"
          }`}
        >
          {replyState.ok || resetState.ok ? replyState.message || resetState.message : replyState.message || resetState.message}
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-2 border-t border-hairline pt-4">
        <a href={`#reply-${complaint.id}`} className={buttonClass({ variant: "secondary", size: "sm" })}>
          <MessageSquareReply className="h-4 w-4" aria-hidden />
          {complaint.response ? "Update the answer" : "Answer"}
        </a>
        <button
          type="button"
          onClick={() => setShowReset((value) => !value)}
          aria-expanded={showReset}
          className={buttonClass({ variant: "ghost", size: "sm" })}
        >
          <KeyRound className="h-4 w-4" aria-hidden />
          {showReset ? "Hide reset" : "Reset access details"}
        </button>
      </div>

      <form id={`reply-${complaint.id}`} action={replyAction} className="mt-4 space-y-3">
        <input type="hidden" name="complaintId" value={complaint.id} />
        <div>
          <label htmlFor={`response-${complaint.id}`} className={labelClass}>
            Answer
          </label>
          <textarea
            id={`response-${complaint.id}`}
            name="response"
            rows={3}
            defaultValue={complaint.response ?? ""}
            placeholder="What you did, and what the person should do next."
            className={inputClass}
          />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <button type="submit" disabled={replyPending} aria-busy={replyPending} className={buttonClass({ size: "sm" })}>
            {replyPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <CheckCircle2 className="h-4 w-4" aria-hidden />}
            {replyPending ? "Saving…" : closed ? "Save answer" : "Answer"}
          </button>
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-ink">
            <input type="checkbox" name="resolve" defaultChecked={!closed} className="h-4 w-4 rounded border-hairline text-primary" />
            Close it as resolved
          </label>
        </div>
      </form>

      {showReset && (
        <form action={resetAction} className="mt-5 space-y-3 rounded-card border border-hairline bg-surface-2/50 p-4">
          <input type="hidden" name="complaintId" value={complaint.id} />
          <p className="text-sm font-bold text-ink">Reset this person&apos;s access</p>
          <p className="text-xs leading-relaxed text-ink-muted">
            Sets a temporary password, corrects the email address if it was wrong, and closes this complaint with the new
            details written into the answer.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor={`reset-email-${complaint.id}`} className={labelClass}>
                Email to sign in with
              </label>
              <input
                id={`reset-email-${complaint.id}`}
                name="email"
                type="email"
                required
                defaultValue={complaint.email}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor={`reset-staff-${complaint.id}`} className={labelClass}>
                Staff ID on the directory
              </label>
              <input
                id={`reset-staff-${complaint.id}`}
                name="staffId"
                defaultValue={complaint.staffId ?? ""}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label htmlFor={`reset-note-${complaint.id}`} className={labelClass}>
              Note to include in the answer
            </label>
            <input
              id={`reset-note-${complaint.id}`}
              name="note"
              placeholder="Your email has been corrected."
              className={inputClass}
            />
          </div>
          <button type="submit" disabled={resetPending} aria-busy={resetPending} className={buttonClass({ size: "sm" })}>
            {resetPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <KeyRound className="h-4 w-4" aria-hidden />}
            {resetPending ? "Resetting…" : "Reset and close"}
          </button>
        </form>
      )}
    </li>
  );
}
