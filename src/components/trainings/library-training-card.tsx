"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { CalendarDays, MapPin, MessageSquare, Paperclip, Users } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { TRAINING_STATUS_LABELS, type TrainingStatus } from "@/lib/labels";
import { ResourceTiles } from "@/components/trainings/resource-viewer";
import { loadTrainingViewAction, type TrainingView } from "@/lib/server/actions/training-view";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; data: TrainingView }
  | { status: "error"; message: string };

/**
 * A training in the library, read in place.
 *
 * The card is a real link — middle-click, open-in-new-tab and a browser without
 * JavaScript all still work — but a plain click opens the training in an overlay
 * over the library instead of navigating to Trainings. Browsing a library
 * should not cost you the page you were browsing.
 *
 * The content is loaded when the panel opens, not with the page: an area with
 * thirty trainings should not pay for thirty write-ups and thirty signed links.
 */
export function LibraryTrainingCard({
  trainingId,
  href,
  children,
}: {
  trainingId: string;
  /** Where the full page lives, for the fallback and the "open full page" link. */
  href: string;
  children: ReactNode;
}) {
  const [state, setState] = useState<State>({ status: "idle" });

  function load() {
    // Once loaded, reopening the panel is instant; a failure is retried.
    if (state.status === "ready" || state.status === "loading") return;
    setState({ status: "loading" });
    loadTrainingViewAction(trainingId)
      .then((result) => {
        setState(result.ok ? { status: "ready", data: result.data } : { status: "error", message: result.message });
      })
      .catch(() => setState({ status: "error", message: "That training could not be read just now. Try again." }));
  }

  const title = state.status === "ready" ? state.data.title : "Training";

  return (
    <Dialog
      size="lg"
      allowFullscreen
      title={title}
      trigger={({ open }) => (
        <a
          href={href}
          onClick={(event) => {
            // Keep the browser's own gestures: new tab, new window, download.
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
            event.preventDefault();
            open();
            load();
          }}
          className="group flex h-full flex-col gap-3 rounded-card border border-hairline bg-surface p-5 shadow-panel transition-colors hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {children}
        </a>
      )}
    >
      <div className="space-y-5">
        {state.status === "loading" && (
          <div className="space-y-3" aria-live="polite">
            {/* The shape of the answer, so the panel does not jump when it lands. */}
            <div className="h-5 w-2/3 animate-pulse rounded bg-surface-2" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-surface-2" />
            <div className="h-24 animate-pulse rounded-control bg-surface-2" />
            <p className="text-sm text-ink-muted">Opening the training…</p>
          </div>
        )}

        {state.status === "error" && (
          <div className="space-y-3">
            <p role="alert" className="rounded-control border border-danger/40 bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
              {state.message}
            </p>
            <Link href={href} className={buttonClass({ variant: "secondary", size: "sm" })}>
              Open the full page instead
            </Link>
          </div>
        )}

        {state.status === "ready" && <TrainingViewBody data={state.data} href={href} />}
      </div>
    </Dialog>
  );
}

function TrainingViewBody({ data, href }: { data: TrainingView; href: string }) {
  const place = data.place;
  return (
    <div className="space-y-5">
      {data.coverSrc && (
        // eslint-disable-next-line @next/next/no-img-element -- a signed URL, not a build-time asset
        <img
          src={data.coverSrc}
          alt={`Cover picture for ${data.title}`}
          className="h-52 w-full rounded-card border border-hairline object-cover"
        />
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{data.year}</Badge>
        <Badge variant="default">{TRAINING_STATUS_LABELS[data.status as TrainingStatus] ?? data.status}</Badge>
        {data.fieldName && (
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            {data.fieldName}
            {data.areaName ? ` · ${data.areaName}` : ""}
          </span>
        )}
      </div>

      <dl className="grid gap-3 sm:grid-cols-2">
        <div className="flex items-start gap-2 text-sm text-ink-muted">
          <CalendarDays className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <div>
            <dt className="sr-only">Dates</dt>
            <dd>
              {formatDate(data.dates.split(" → ")[0])}
              {data.dates.includes(" → ") ? ` – ${formatDate(data.dates.split(" → ")[1])}` : ""}
              {data.durationText ? ` · ${data.durationText}` : ""}
            </dd>
          </div>
        </div>
        {place && (
          <div className="flex items-start gap-2 text-sm text-ink-muted">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <div>
              <dt className="sr-only">Where</dt>
              <dd>{place}</dd>
            </div>
          </div>
        )}
        {data.attendeeCount !== null && data.status === "COMPLETED" && (
          <div className="flex items-start gap-2 text-sm text-ink-muted">
            <Users className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <div>
              <dt className="sr-only">Attendee count recorded</dt>
              <dd>{data.attendeeCount.toLocaleString("en-GB")} attendees recorded</dd>
            </div>
          </div>
        )}
        {data.targetGroup && (
          <div className="flex items-start gap-2 text-sm text-ink-muted">
            <Users className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <div>
              <dt className="sr-only">For</dt>
              <dd>For {data.targetGroup}</dd>
            </div>
          </div>
        )}
      </dl>

      {data.notes ? (
        <p className="max-w-[70ch] whitespace-pre-line text-sm leading-relaxed text-ink-muted">{data.notes}</p>
      ) : null}

      <section aria-labelledby="panel-resources" className="space-y-2">
        <h3 id="panel-resources" className="flex items-center gap-2 text-sm font-bold text-ink">
          <Paperclip className="h-4 w-4 text-primary" aria-hidden />
          Resources
        </h3>
        {/*
         * A grid of compact tiles, not full-width rows: a file is a thing you
         * pick, and a row stretched across the panel reads like a section heading
         * with a download bolted on. Two-up, and each one opens to be read.
         */}
        <ResourceTiles trainingId={data.id} trainingTitle={data.title} resources={data.resources} />
      </section>

      <section aria-labelledby="panel-discussion" className="space-y-2">
        <h3 id="panel-discussion" className="flex items-center gap-2 text-sm font-bold text-ink">
          <MessageSquare className="h-4 w-4 text-primary" aria-hidden />
          Discussion
        </h3>
        {data.comments.length === 0 ? (
          <p className="text-sm text-ink-muted">No comments yet.</p>
        ) : (
          <ul className="space-y-2">
            {data.comments.slice(0, 5).map((comment) => (
              <li key={comment.id} className="rounded-control border border-hairline bg-surface-2/40 px-3 py-2">
                <p className="text-xs font-semibold text-ink">
                  {comment.authorName} <span className="font-normal text-ink-muted">· {comment.authorRole}</span>
                </p>
                <p className="mt-1 whitespace-pre-line text-sm text-ink-muted">{comment.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex flex-wrap items-center gap-2 border-t border-hairline pt-4">
        <Link href={href} className={buttonClass({ variant: "secondary", size: "sm" })}>
          Open the full page
        </Link>
        <span className="text-xs text-ink-muted">Reading view — nothing here changes the record.</span>
      </div>
    </div>
  );
}
