"use client";

import { useActionState, useState } from "react";
import { FileText, Loader2, Paperclip, Trash2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { hintClass, inputClass, labelClass } from "@/components/ui/input";
import { MIME_ALLOWLIST } from "@/lib/ghs-constants";
import { formatBytes, formatDate } from "@/lib/format";
import {
  finaliseTrainingResourceAction,
  removeTrainingResourceAction,
  requestTrainingResourceAction,
  type TrainingActionState,
} from "@/lib/server/actions/trainings";

export interface ResourceRow {
  id: string;
  title: string;
  mimeType: string | null;
  sizeBytes: number | null;
  uploadedByName: string | null;
  createdAt: Date;
}

const ACCEPT = MIME_ALLOWLIST.join(",");

/**
 * The files that belong to one training: slides, the attendance sheet, the
 * report. Optional at creation and after it — the browser uploads straight to
 * storage with a presigned URL, so a 250 MB recording behaves like a 1 MB memo.
 */
export function TrainingResources({
  trainingId,
  resources,
  canEdit,
  ceiling,
}: {
  trainingId: string;
  resources: ResourceRow[];
  canEdit: boolean;
  /** What this deployment can actually accept, so the hint is not a guess. */
  ceiling: { bytes: number; detail: string };
}) {
  return (
    <section
      aria-labelledby="resources-heading"
      className="rounded-card border border-hairline bg-surface p-6 shadow-panel"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="resources-heading" className="flex items-center gap-2 text-sm font-bold text-ink">
            <Paperclip className="h-4 w-4 text-primary" aria-hidden />
            Resources
          </h2>
          <p className="mt-1 max-w-[70ch] text-sm leading-relaxed text-ink-muted">
            {resources.length === 0
              ? "Nothing attached yet. Slides, attendance sheets and reports can be added now or at any time."
              : `${resources.length} file${resources.length === 1 ? "" : "s"} attached. They are shown at the top of this page as download chips; this panel is where files are added and withdrawn.`}
          </p>
        </div>

        {canEdit && (
          <Dialog
            size="sm"
            title="Add a resource"
            description="It is uploaded straight to storage. Nothing else about the training changes."
            trigger={({ open }) => (
              <Button type="button" size="sm" variant="secondary" onClick={open}>
                <UploadCloud className="h-4 w-4" aria-hidden />
                Add file
              </Button>
            )}
          >
            {({ close }) => <UploadForm trainingId={trainingId} onDone={close} ceiling={ceiling} />}
          </Dialog>
        )}
      </div>

      {resources.length > 0 && (
        <ul className="mt-5 divide-y divide-hairline">
          {resources.map((resource) => (
            <li key={resource.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{resource.title}</p>
                  <p className="text-xs text-ink-muted">
                    {[resource.sizeBytes !== null ? formatBytes(resource.sizeBytes) : null, resource.uploadedByName, formatDate(resource.createdAt)]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              </div>

              {canEdit && (
                <form action={removeTrainingResourceAction}>
                  <input type="hidden" name="trainingId" value={trainingId} />
                  <input type="hidden" name="resourceId" value={resource.id} />
                  <button
                    type="submit"
                    aria-label={`Remove ${resource.title}`}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-muted hover:bg-danger/10 hover:text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function UploadForm({
  trainingId,
  onDone,
  ceiling,
}: {
  trainingId: string;
  onDone: () => void;
  ceiling: { bytes: number; detail: string };
}) {
  const [state, formAction, pending] = useActionState<TrainingActionState, FormData>(
    finaliseTrainingResourceAction,
    { ok: true, message: null },
  );
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [phase, setPhase] = useState<"idle" | "uploading">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setError("Choose a file first.");
      return;
    }
    if (file.size > ceiling.bytes) {
      setError(ceiling.detail);
      return;
    }

    setError(null);
    setPhase("uploading");

    const target = await requestTrainingResourceAction({
      trainingId,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      title: title.trim() || file.name,
    });
    if (!target.ok || !target.uploadUrl || !target.storageKey) {
      setPhase("idle");
      setError(target.message ?? "That file cannot be attached.");
      return;
    }

    try {
      const response = await fetch(target.uploadUrl, {
        method: "PUT",
        headers: { "content-type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    } catch {
      setPhase("idle");
      setError("The upload did not finish. Check your connection and try again.");
      return;
    }

    setPhase("idle");
    const data = new FormData();
    data.set("trainingId", trainingId);
    data.set("storageKey", target.storageKey);
    data.set("title", title.trim() || file.name);
    data.set("mimeType", file.type || "application/octet-stream");
    formAction(data);
  }

  if (state.ok && state.message) {
    return (
      <div className="space-y-4">
        <p className="rounded-control border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
          {state.message}
        </p>
        <Button type="button" className="w-full" onClick={onDone}>
          Done
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="resource-title" className={labelClass}>
          What is it? (optional)
        </label>
        <input
          id="resource-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="e.g. Slide deck, attendance sheet"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="resource-file" className={labelClass}>
          File
        </label>
        <input
          id="resource-file"
          type="file"
          accept={ACCEPT}
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          className="block w-full text-sm text-ink file:mr-3 file:rounded-full file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary"
        />
        <p className={hintClass}>
          The deck, the attendance sheet, the report, the recording: PDF, Word, PowerPoint, Excel, video, audio,
          image or CSV, up to {formatBytes(ceiling.bytes)} per file here. {ceiling.detail}
        </p>
      </div>

      {(error || (state.message && !state.ok)) && (
        <p role="alert" className="text-sm text-danger">
          {error ?? state.message}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={pending || phase === "uploading"} aria-busy={phase === "uploading"}>
        {phase === "uploading" || pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <UploadCloud className="h-4 w-4" aria-hidden />}
        {phase === "uploading" ? "Uploading…" : pending ? "Saving…" : "Attach file"}
      </Button>
    </form>
  );
}
