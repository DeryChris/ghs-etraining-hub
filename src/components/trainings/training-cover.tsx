"use client";

import { useActionState, useRef } from "react";
import { ImagePlus, Maximize2, Trash2, UploadCloud } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { FileDrop } from "@/components/ui/file-drop";
import { hintClass } from "@/components/ui/input";
import {
  removeTrainingImageAction,
  uploadTrainingImageAction,
  type CommentActionState,
} from "@/lib/server/actions/trainings";

const INITIAL: CommentActionState = { ok: false, message: null };

/**
 * The top of a training page: the picture the facilitator uploaded, or the space
 * where one would go.
 *
 * The placeholder is not an accident being hidden — it says what belongs there and
 * who puts it there, because an empty grey band with no explanation reads as a
 * broken page. The expand icon opens the picture on its own, which is what people
 * do with a photo of an event.
 */
export function TrainingCover({
  trainingId,
  title,
  imageSrc,
  canEdit,
}: {
  trainingId: string;
  title: string;
  imageSrc: string | null;
  canEdit: boolean;
}) {
  const [state, formAction, pending] = useActionState(uploadTrainingImageAction, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <section aria-label="Training picture" className="space-y-3">
      {imageSrc ? (
        <a
          href={imageSrc}
          target="_blank"
          rel="noreferrer noopener"
          className="group relative block overflow-hidden rounded-card border border-hairline bg-surface-2 shadow-panel"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- a signed URL, not a build-time asset */}
          <img src={imageSrc} alt={`Cover picture for ${title}`} className="h-56 w-full object-cover sm:h-72" />
          <span className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white transition-colors group-hover:bg-black/70">
            <Maximize2 className="h-4 w-4" aria-hidden />
            <span className="sr-only">Open the picture full size</span>
          </span>
        </a>
      ) : (
        <div className="flex h-44 flex-col items-center justify-center gap-2 rounded-card border border-dashed border-hairline bg-surface-2/60 px-6 text-center">
          <ImagePlus className="h-7 w-7 text-ink-muted" aria-hidden />
          <p className="text-sm font-semibold text-ink-muted">A picture of the training can go here</p>
          <p className="max-w-sm text-xs leading-relaxed text-ink-muted">
            Optional, and uploaded only by the facilitator who filed this training — a photograph from the session, a
            poster, or the agenda.
          </p>
        </div>
      )}

      {canEdit && (
        <div className="flex flex-wrap items-center gap-3 rounded-card border border-hairline bg-surface p-4 shadow-panel">
          <form ref={formRef} action={formAction} className="w-full max-w-md space-y-3">
            <input type="hidden" name="trainingId" value={trainingId} />
            <FileDrop
              id="training-cover"
              name="image"
              label="Cover picture"
              accept="image/png,image/jpeg,image/webp,image/gif"
              disabled={pending}
              hint="PNG, JPEG, WebP or GIF, under 4 MB. Dropped straight onto the dashed box."
            />
            <button type="submit" disabled={pending} aria-busy={pending} className={buttonClass({ variant: "secondary", size: "sm" })}>
              <UploadCloud className="h-4 w-4" aria-hidden />
              {pending ? "Uploading…" : imageSrc ? "Replace picture" : "Add picture"}
            </button>
          </form>

          {imageSrc && (
            <form action={removeTrainingImageAction}>
              <input type="hidden" name="trainingId" value={trainingId} />
              <button type="submit" className={buttonClass({ variant: "ghost", size: "sm" })}>
                <Trash2 className="h-4 w-4" aria-hidden />
                Remove
              </button>
            </form>
          )}

          <p className={state.message ? `text-sm ${state.ok ? "text-primary" : "text-danger"}` : hintClass} role="status" aria-live="polite">
            {state.message ?? "The picture appears at the top of this page for everyone who can read the training."}
          </p>
        </div>
      )}
    </section>
  );
}
