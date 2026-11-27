"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileWarning,
  FileX2,
  GraduationCap,
  KeyRound,
  Loader2,
  MessageSquareWarning,
  Search,
  Send,
  UserCog,
  type LucideIcon,
} from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { FormSteps } from "@/components/ui/form-steps";
import { hintClass, inputClass, labelClass } from "@/components/ui/input";
import { Select, type SelectOption } from "@/components/ui/select";
import {
  COMPLAINT_ISSUES,
  COMPLAINT_ISSUE_HELP,
  COMPLAINT_ISSUE_LABELS,
  complaintIsAboutAFile,
  type ComplaintIssue,
} from "@/lib/labels";
import {
  lookupStaffAction,
  lookupTrainingsAction,
  submitComplaintAction,
  type ComplaintState,
} from "@/lib/server/actions/complaints";

/**
 * The public complaint form.
 *
 * It is deliberately forgiving: a person using it may be locked out, on a phone,
 * and in a hurry. So the Staff ID does the typing where it can, the issue is a
 * row of cards that say what they mean rather than a word in a dropdown, and a
 * complaint about a document asks which training in the same breath — asking
 * afterwards costs a day of email.
 */

const INITIAL: ComplaintState = { ok: false, message: null };

const ISSUE_ICONS: Record<ComplaintIssue, LucideIcon> = {
  LOGIN_ACCESS: KeyRound,
  WRONG_DOCUMENT: FileWarning,
  DOC_INACCESSIBLE: FileX2,
  COURSE_RELATED: GraduationCap,
  PERSONAL_DETAILS: UserCog,
  OTHERS: MessageSquareWarning,
};

export interface ComplaintFormInitial {
  issue?: ComplaintIssue | null;
  trainingId?: string | null;
  trainingTitle?: string | null;
  subject?: string | null;
}

export function ComplaintForm({ initial }: { initial?: ComplaintFormInitial }) {
  const [state, action, pending] = useActionState(submitComplaintAction, INITIAL);
  const [lookupPending, startLookup] = useTransition();
  const [staffId, setStaffId] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [issueType, setIssueType] = useState<ComplaintIssue>(initial?.issue ?? "LOGIN_ACCESS");
  const [lookupMessage, setLookupMessage] = useState<{ ok: boolean; text: string } | null>(null);

  // The training a document complaint is about, chosen from a search.
  const [training, setTraining] = useState<{ id: string; title: string } | null>(
    initial?.trainingId && initial.trainingTitle
      ? { id: initial.trainingId, title: initial.trainingTitle }
      : null,
  );
  const [trainingQuery, setTrainingQuery] = useState("");
  const [trainingOptions, setTrainingOptions] = useState<SelectOption[]>([]);
  const [trainingMessage, setTrainingMessage] = useState<string | null>(null);
  const [trainingPending, startTrainingSearch] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const aboutAFile = complaintIsAboutAFile(issueType);

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
      if (result.person) setFullName(result.person.fullName);
    });
  }

  function searchTrainings() {
    if (trainingQuery.trim().length < 3) {
      setTrainingMessage("Type at least three letters of the training name.");
      return;
    }
    startTrainingSearch(async () => {
      const data = new FormData();
      data.set("query", trainingQuery.trim());
      const result = await lookupTrainingsAction({ ok: false, message: null }, data);
      setTrainingMessage(result.message);
      setTrainingOptions(
        (result.trainings ?? []).map((row) => ({
          value: row.id,
          label: row.title,
          hint: new Date(row.organisedOn).toLocaleDateString("en-GB", {
            month: "long",
            year: "numeric",
          }),
        })),
      );
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
    <form
      action={action}
      noValidate
      onSubmit={(event) => {
        // The training is not a native control, so it cannot stop the submit on
        // its own. Saying it here keeps a document complaint from being lodged
        // without the thing it is about.
        if (aboutAFile && !training) {
          event.preventDefault();
          setFormError("Choose the training the document belongs to — the desk cannot look at a file it cannot find.");
          return;
        }
        setFormError(null);
      }}
      className="space-y-6"
    >
      {state.message && !state.ok && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-control border border-danger/40 bg-danger/10 px-4 py-3 text-sm leading-relaxed text-danger"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {state.message}
        </p>
      )}

      <FormSteps
        steps={[
          { title: "You", blurb: "who we should answer" },
          { title: "The problem", blurb: "what went wrong" },
          { title: "The details", blurb: "what happened, in your words" },
        ]}
        panels={[
          /* ── Step 1: who ─────────────────────────────────────────────────── */
          <div key="who" className="space-y-5">
            <div className="rounded-card border border-hairline bg-surface-2/50 p-4">
              <label htmlFor="staffId" className={labelClass}>
                Staff ID
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
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
                  {lookupPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Search className="h-4 w-4" aria-hidden />
                  )}
                  {lookupPending ? "Looking…" : "Look up"}
                </button>
              </div>
              <p className={hintClass}>
                This fills in your name, region and facility from the staff directory. No account yet? Leave it blank
                and we will find you by email.
              </p>
              {lookupMessage && (
                <p
                  role="status"
                  className={`mt-2 text-xs font-semibold ${lookupMessage.ok ? "text-primary" : "text-ink-muted"}`}
                >
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
                  minLength={3}
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  autoComplete="name"
                  placeholder="As it appears on the staff list"
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
                Phone <span className="font-normal normal-case text-ink-muted">(optional)</span>
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                placeholder="024 000 0000"
                className={inputClass}
              />
              <p className={hintClass}>Only used to reach you about this complaint.</p>
            </div>
          </div>,

          /* ── Step 2: what went wrong ──────────────────────────────────────── */
          <div key="issue" className="space-y-5">
            <input type="hidden" name="issueType" value={issueType} />
            <div role="radiogroup" aria-label="What is the complaint about?" className="grid gap-2.5 sm:grid-cols-2">
              {COMPLAINT_ISSUES.map((issue) => {
                const Icon = ISSUE_ICONS[issue];
                const selected = issue === issueType;
                return (
                  <button
                    key={issue}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => {
                      setIssueType(issue);
                      setFormError(null);
                    }}
                    className={`flex items-start gap-3 rounded-card border p-3.5 text-left transition-[border-color,background-color,transform] duration-base active:translate-y-px ${
                      selected
                        ? "border-primary bg-primary/[0.07] ring-2 ring-primary/25"
                        : "border-hairline bg-surface hover:border-primary/40 hover:bg-surface-2/60"
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        selected ? "bg-primary text-primary-ink" : "bg-primary/10 text-primary"
                      }`}
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 text-sm font-bold text-ink">
                        {COMPLAINT_ISSUE_LABELS[issue]}
                        {selected && <CheckCircle2 className="h-3.5 w-3.5 text-primary" aria-hidden />}
                      </span>
                      <span className="mt-0.5 block text-xs leading-snug text-ink-muted">
                        {COMPLAINT_ISSUE_HELP[issue]}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            {aboutAFile && (
              <div className="space-y-4 rounded-card border border-primary/30 bg-primary/[0.05] p-4">
                <div>
                  <p className="flex items-center gap-2 text-sm font-bold text-ink">
                    <FileWarning className="h-4 w-4 text-primary" aria-hidden />
                    Which training is the document on?
                  </p>
                  <p className={hintClass}>
                    Search by the training&apos;s name, then pick it from the list. Only one has to be chosen — the
                    reference to the file itself can follow in the box below.
                  </p>
                </div>

                <input type="hidden" name="trainingId" value={training?.id ?? ""} />

                {training ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-primary/40 bg-surface px-3.5 py-2.5">
                    <span className="min-w-0">
                      <span className="block text-[11px] font-bold uppercase tracking-wide text-ink-muted">
                        Training selected
                      </span>
                      <span className="block truncate text-sm font-semibold text-ink">{training.title}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setTraining(null)}
                      className={buttonClass({ variant: "ghost", size: "sm" })}
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        value={trainingQuery}
                        onChange={(event) => setTrainingQuery(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            searchTrainings();
                          }
                        }}
                        placeholder="e.g. IPC refresher"
                        aria-label="Training name"
                        className={inputClass}
                      />
                      <button
                        type="button"
                        onClick={searchTrainings}
                        disabled={trainingPending}
                        className={buttonClass({ variant: "secondary", className: "shrink-0" })}
                      >
                        {trainingPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        ) : (
                          <Search className="h-4 w-4" aria-hidden />
                        )}
                        {trainingPending ? "Searching…" : "Search"}
                      </button>
                    </div>

                    {trainingOptions.length > 0 && (
                      <Select
                        aria-label="Training the document belongs to"
                        options={trainingOptions}
                        placeholder="Choose the training from the results"
                        searchable
                        onChange={(value) => {
                          const chosen = trainingOptions.find((option) => option.value === value);
                          if (chosen) {
                            setTraining({ id: chosen.value, title: chosen.label });
                            setFormError(null);
                          }
                        }}
                      />
                    )}

                    {trainingMessage && (
                      <p role="status" className="text-xs font-semibold text-ink-muted">
                        {trainingMessage}
                      </p>
                    )}
                  </>
                )}

                {formError && (
                  <p role="alert" className="flex items-start gap-2 text-sm font-medium text-danger">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    {formError}
                  </p>
                )}
              </div>
            )}
          </div>,

          /* ── Step 3: the words ────────────────────────────────────────────── */
          <div key="details" className="space-y-5">
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
                defaultValue={initial?.subject ?? ""}
                placeholder={
                  aboutAFile ? "The slide deck on the IPC refresher is the 2024 one" : "I cannot sign in with my new email"
                }
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
                placeholder={
                  aboutAFile
                    ? "Which file, what it should be, and what you see when you open it."
                    : "Say what you were doing, what the screen said, and what you have already tried."
                }
                className={inputClass}
              />
              <p className={hintClass}>A sentence or two is enough. Do not include your password.</p>
            </div>
          </div>,
        ]}
        footer={
          <button type="submit" disabled={pending} aria-busy={pending} className={buttonClass({ className: "min-h-11" })}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
            {pending ? "Lodging your complaint…" : "Lodge complaint"}
          </button>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-4">
        <p className="text-xs text-ink-muted">Nothing is cleared if a step needs another look.</p>
        <Link href="/help/status" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
          Already lodged one? Check its status
        </Link>
      </div>
    </form>
  );
}
