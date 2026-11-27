"use client";

import { useActionState, useEffect, useRef } from "react";
import { MessagesSquare, Send, Trash2 } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { inputClass } from "@/components/ui/input";
import {
  addTrainingCommentAction,
  deleteTrainingCommentAction,
  type CommentActionState,
} from "@/lib/server/actions/trainings";

const INITIAL: CommentActionState = { ok: false, message: null };

export interface DiscussionComment {
  id: string;
  body: string;
  authorName: string;
  authorRole: string;
  createdAtLabel: string;
  /** The reader wrote it, or may moderate it. */
  canDelete: boolean;
}

const INITIALS = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

/**
 * The conversation under a training.
 *
 * Flat and chronological, like a comment thread anywhere else: newest at the
 * bottom, next to the box you type in. Messages say who wrote them and when, and
 * the author or an administrator can remove one — nothing else is editable, because
 * a discussion that people can rewrite afterwards is worth nothing.
 */
export function Discussion({
  trainingId,
  comments,
}: {
  trainingId: string;
  comments: DiscussionComment[];
}) {
  const [state, formAction, pending] = useActionState(addTrainingCommentAction, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      bodyRef.current?.focus();
    }
  }, [state]);

  return (
    <section aria-labelledby="discussion-heading" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="discussion-heading" className="flex items-center gap-2 text-lg font-bold text-ink">
            <MessagesSquare className="h-5 w-5 text-primary" aria-hidden />
            Discussion
          </h2>
          <p className="text-sm text-ink-muted">
            Questions and notes about this training, in the open — they stay with the training instead of a group chat.
          </p>
        </div>
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
          {comments.length} {comments.length === 1 ? "message" : "messages"}
        </span>
      </div>

      {comments.length === 0 ? (
        <p className="rounded-card border border-dashed border-hairline bg-surface-2/60 px-4 py-6 text-center text-sm text-ink-muted">
          No messages yet. Ask the first question.
        </p>
      ) : (
        <ul className="space-y-3">
          {comments.map((comment) => (
            <li key={comment.id} className="flex gap-3 rounded-card border border-hairline bg-surface p-4 shadow-panel">
              <span
                aria-hidden
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary"
              >
                {INITIALS(comment.authorName) || "GHS"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-sm font-semibold text-ink">{comment.authorName}</span>
                  <span className="text-[11px] uppercase tracking-wider text-ink-muted">{comment.createdAtLabel}</span>
                </p>
                <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink">{comment.body}</p>
              </div>
              {comment.canDelete && (
                <form action={deleteTrainingCommentAction} className="shrink-0">
                  <input type="hidden" name="trainingId" value={trainingId} />
                  <input type="hidden" name="commentId" value={comment.id} />
                  <button
                    type="submit"
                    aria-label={`Remove your message from ${comment.createdAtLabel}`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-ink-muted hover:bg-danger/10 hover:text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}

      <form ref={formRef} action={formAction} className="rounded-card border border-hairline bg-surface p-4 shadow-panel">
        <input type="hidden" name="trainingId" value={trainingId} />
        <label htmlFor="discussion-body" className="text-sm font-semibold text-ink">
          Add a message
        </label>
        <textarea
          id="discussion-body"
          name="body"
          ref={bodyRef}
          rows={3}
          maxLength={2000}
          required
          disabled={pending}
          placeholder="Ask a question, or leave a note for the next cohort…"
          className={`${inputClass} mt-2`}
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p role="status" aria-live="polite" className={state.message ? `text-sm ${state.ok ? "text-primary" : "text-danger"}` : "text-xs text-ink-muted"}>
            {state.message ?? "Everyone signed in can read this. Keep it to the training."}
          </p>
          <button type="submit" disabled={pending} aria-busy={pending} className={buttonClass({ size: "sm" })}>
            <Send className="h-4 w-4" aria-hidden />
            {pending ? "Posting…" : "Post message"}
          </button>
        </div>
      </form>
    </section>
  );
}
