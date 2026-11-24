"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Search, Send } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { hintClass, inputClass, labelClass } from "@/components/ui/input";
import { COMPLAINT_ISSUES, COMPLAINT_ISSUE_HELP, COMPLAINT_ISSUE_LABELS } from "@/lib/labels";
import {
  lookupStaffAction,
  submitComplaintAction,
  type ComplaintState,
} from "@/lib/server/actions/complaints";

/**
 * The public complaint form. It is deliberately forgiving: a person using it may
 * be locked out, on a phone, and in a hurry, so the Staff ID does the typing
 * where it can (one look-up fills the name, region and facility), the issue type
 * says what it means, and the reference is impossible to miss once lodged.
 */

const INITIAL: ComplaintState = { ok: false, message: null };

export function ComplaintForm() {
  const [state, action, pending] = useActionState(submitComplaintAction, INITIAL);
  const [lookupPending, startLookup] = useTransition();
  const [staffId, setStaffId] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [issueType, setIssueType] = useState<string>("LOGIN_ACCESS");
  const [lookupMessage, setLookupMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function lookUp() {
    if (!staffId.trim()) {
      setLookupMessage({ ok: false, text: "Type your Staff ID first, then press Look up." });
      return;
    }
    startLookup(async () => {
      const data = new FormData();
      data.set("staffId", staffId.trim());
      const result = await lookupStaffAction({ ok: false, message: null }, data);
      setLookupMessage({ ok: result.ok, text: result.message ?? "" });
      if (result.person) {
        setFullName(result.person.fullName);
      }
    });
  }

  if (state.ok) {
    return (
      <>
        <div className="space-y-5 rounded-card border border-primary/30 bg-primary/[0.06] p-7">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            Complaint lodged
          </p>
          {state.reference && (
            <p className="font-mono text-3xl font-extrabold tracking-tight text-ink">{state.reference}</p>
          )}
          <p className="text-sm leading-relaxed text-ink-muted">{state.message}</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/help/status" className={buttonClass({ variant: "primary" })}>
              Check the status later
            </Link>
            <Link href="/" className={buttonClass({ variant: "secondary" })}>
              Back to the home page
            </Link>
          </div>
          <p className="text-xs text-ink-muted">
            Keep the reference. Anyone who handles this will ask for it, and the answer is kept against your Staff ID.
          </p>
        </div>
      </>
    );
  }

  return (
    <form action={action} className="space-y-6">
      {state.message && !state.ok && (
        <p role="alert" className="flex items-start gap-2 rounded-control border border-danger/40 bg-danger/10 px-4 py-3 text-sm leading-relaxed text-danger">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {state.message}
        </p>
      )}

      <div className="rounded-card border border-hairline bg-surface-2/50 p-4">
        <label htmlFor="staffId" className={labelClass}>
          Staff ID
        </label>
        <div className="flex gap-2">
          <input
            id="staffId"
            name="staffId"
            value={staffId}
            onChange={(event) => setStaffId(event.target.value)}
            inputMode="numeric"
            autoComplete="off"
            placeholder="1587583"
            className={inputClass}
          />
          <button
            type="button"
            onClick={lookUp}
            disabled={lookupPending}
            className={buttonClass({ variant: "secondary", className: "shrink-0" })}
          >
            {lookupPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Search className="h-4 w-4" aria-hidden />}
            {lookupPending ? "Looking…" : "Look up"}
          </button>
        </div>
        <p className={hintClass}>
          This fills in your name, region and facility from the staff directory. No account yet? Leave it blank and we
          will find you by email.
        </p>
        {lookupMessage && (
          <p role="status" className={`mt-2 text-xs font-semibold ${lookupMessage.ok ? "text-primary" : "text-ink-muted"}`}>
            {lookupMessage.text}
          </p>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="fullName" className={labelClass}>
            Full name
          </label>
          <input
            id="fullName"
            name="fullName"
            required
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            autoComplete="name"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="email" className={labelClass}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            placeholder="name@ghs.gov.gh"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="phone" className={labelClass}>
          Phone <span className="font-normal text-ink-muted">(optional)</span>
        </label>
        <input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="024 000 0000" className={inputClass} />
        <p className={hintClass}>Only used to reach you about this complaint.</p>
      </div>

      <div>
        <label htmlFor="issueType" className={labelClass}>
          What is the complaint about?
        </label>
        <select
          id="issueType"
          name="issueType"
          value={issueType}
          onChange={(event) => setIssueType(event.target.value)}
          className={inputClass}
        >
          {COMPLAINT_ISSUES.map((issue) => (
            <option key={issue} value={issue}>
              {COMPLAINT_ISSUE_LABELS[issue]}
            </option>
          ))}
        </select>
        <p className={hintClass}>{COMPLAINT_ISSUE_HELP[issueType as keyof typeof COMPLAINT_ISSUE_HELP]}</p>
      </div>

      <div>
        <label htmlFor="subject" className={labelClass}>
          In a few words
        </label>
        <input
          id="subject"
          name="subject"
          required
          minLength={5}
          maxLength={140}
          placeholder="I cannot sign in with my new email"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="description" className={labelClass}>
          What happened?
        </label>
        <textarea
          id="description"
          name="description"
          required
          minLength={20}
          rows={6}
          placeholder="Say what you were doing, what the screen said, and what you have already tried."
          className={inputClass}
        />
        <p className={hintClass}>A sentence or two is enough. Do not include your password.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} aria-busy={pending} className={buttonClass({ className: "min-h-12" })}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
          {pending ? "Lodging your complaint…" : "Lodge complaint"}
        </button>
        <Link href="/help/status" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
          Already lodged one? Check its status
        </Link>
      </div>
    </form>
  );
}
