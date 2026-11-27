"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Download,
  ExternalLink,
  File as FileIcon,
  FileSpreadsheet,
  FileText,
  Flag,
  Image as ImageIcon,
  Loader2,
  Music,
  PlayCircle,
  Presentation,
  RefreshCw,
  UploadCloud,
  type LucideIcon,
} from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { buttonClass } from "@/components/ui/button";
import { FileDrop } from "@/components/ui/file-drop";
import { inputClass, labelClass } from "@/components/ui/input";
import { FilePreview } from "@/components/materials/file-preview";
import { formatBytes, formatMimeType } from "@/lib/format";
import { MIME_ALLOWLIST, previewKindFor, type PreviewKind } from "@/lib/ghs-constants";
import { replaceTrainingResourceAction, requestTrainingResourceAction } from "@/lib/server/actions/trainings";

export interface ViewableResource {
  id: string;
  title: string;
  mimeType: string | null;
  sizeBytes: number | null;
}

const ICON_BY_KIND: Record<PreviewKind, LucideIcon> = {
  pdf: FileText,
  docx: FileText,
  pptx: Presentation,
  xlsx: FileSpreadsheet,
  image: ImageIcon,
  video: PlayCircle,
  audio: Music,
  text: FileText,
  none: FileIcon,
};

const ACCEPT = MIME_ALLOWLIST.join(",");

function fileHref(trainingId: string, resourceId: string) {
  return `/api/trainings/${trainingId}/resources/${resourceId}/file`;
}

/**
 * One attached file: drawn in the page, kept only if you mean to.
 *
 * Clicking the tile used to download the file — a click meant "show me" far more
 * often than it meant "save this", and on a phone the difference is a lost page
 * and a file manager. So the click opens the file in a wide overlay that draws it
 * the way its own program would (see `file-preview.tsx`), with an expand control
 * that gives it the whole screen, and a Download button that is the only thing
 * that saves anything.
 *
 * Whoever may edit the training also gets "Replace file" here, because the way a
 * wrong attachment gets discovered is by opening it.
 */
export function ResourceTile({
  trainingId,
  trainingTitle,
  resource,
  layout = "tile",
  canEdit = false,
  onReplaced,
}: {
  trainingId: string;
  /** The training's name, so a complaint filed from here already names it. */
  trainingTitle?: string;
  resource: ViewableResource;
  /** `tile` for grids and the library panel, `chip` for a row of attachments. */
  layout?: "tile" | "chip";
  /** Only an editor may swap the bytes; a reader only reads. */
  canEdit?: boolean;
  onReplaced?: () => void;
}) {
  const [replacing, setReplacing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  // Bumped after a replacement so the preview remounts and reads the new bytes
  // instead of showing what the browser already had.
  const [version, setVersion] = useState(0);
  const kind = previewKindFor(resource.mimeType);
  const Icon = ICON_BY_KIND[kind];
  const inline = fileHref(trainingId, resource.id);
  const downloadHref = `${inline}?download=1`;
  const title = resource.title.trim().length > 0 ? resource.title : "Attachment";

  function renderTrigger(open: () => void) {
    return layout === "chip" ? (
      <button
        type="button"
        onClick={open}
        className="group flex min-w-[11rem] max-w-[19rem] flex-1 items-center gap-3 rounded-control border border-hairline bg-surface px-3 py-2.5 text-left shadow-panel transition-colors hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-ink">{title}</span>
          <span className="block text-[11px] uppercase tracking-wider text-ink-muted">
            {formatMimeType(resource.mimeType)}
            {resource.sizeBytes !== null ? ` · ${formatBytes(resource.sizeBytes)}` : ""}
          </span>
        </span>
        <ExternalLink className="h-4 w-4 shrink-0 text-ink-muted transition-colors group-hover:text-primary" aria-hidden />
      </button>
    ) : (
      <button
        type="button"
        onClick={open}
        className="group flex w-full items-center gap-3 rounded-control border border-hairline bg-surface-2/40 px-3 py-2 text-left transition-colors hover:border-primary/40 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-ink group-hover:text-primary">{title}</span>
          <span className="block text-[11px] uppercase tracking-wider text-ink-muted">
            {formatMimeType(resource.mimeType)}
            {resource.sizeBytes !== null ? ` · ${formatBytes(resource.sizeBytes)}` : ""}
          </span>
        </span>
        <ExternalLink className="h-4 w-4 shrink-0 text-ink-muted group-hover:text-primary" aria-hidden />
      </button>
    );
  }

  return (
    <Dialog
      size="xl"
      allowFullscreen
      title={title}
      description={`${formatMimeType(resource.mimeType)}${resource.sizeBytes !== null ? ` · ${formatBytes(resource.sizeBytes)}` : ""}`}
      trigger={({ open }) => renderTrigger(open)}
      bodyClassName="overlay-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-5 sm:px-5"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <a href={downloadHref} className={buttonClass({ variant: "secondary", size: "sm" })}>
            <Download className="h-4 w-4" aria-hidden />
            Download
          </a>
          <a
            href={inline}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClass({ variant: "ghost", size: "sm" })}
          >
            <ExternalLink className="h-4 w-4" aria-hidden />
            Open in a new tab
          </a>
          {canEdit && (
            <button
              type="button"
              onClick={() => setReplacing((value) => !value)}
              aria-expanded={replacing}
              className={buttonClass({ variant: "ghost", size: "sm" })}
            >
              <RefreshCw className="h-4 w-4" aria-hidden />
              {replacing ? "Cancel replace" : "Replace file"}
            </button>
          )}
          <Link
            href={`/help/report?issue=DOC_INACCESSIBLE&training=${trainingId}${
              trainingTitle ? `&trainingTitle=${encodeURIComponent(trainingTitle)}` : ""
            }&subject=${encodeURIComponent(`“${title}” will not open`)}`}
            className={buttonClass({ variant: "ghost", size: "sm" })}
          >
            <Flag className="h-4 w-4" aria-hidden />
            Report a problem with this file
          </Link>
          <span className="ml-auto text-xs text-ink-muted">Reading opens the file; only Download saves it.</span>
        </div>

        {notice && (
          <p role="status" className="rounded-control border border-primary/30 bg-primary/10 px-4 py-2.5 text-sm font-medium text-primary">
            {notice}
          </p>
        )}

        {replacing && (
          <ReplaceForm
            trainingId={trainingId}
            resourceId={resource.id}
            title={title}
            onDone={(message) => {
              setReplacing(false);
              setNotice(message);
              setVersion((value) => value + 1);
              onReplaced?.();
            }}
          />
        )}

        <div className="overflow-hidden rounded-card border border-hairline">
          <FilePreview key={version} kind={kind} title={title} fileHref={inline} />
        </div>
      </div>
    </Dialog>
  );
}

/**
 * Attach a different file to the same record.
 *
 * It uploads straight to storage with a presigned URL — the same path the add
 * form uses — and only then asks the server to point the row at the new object.
 * The old file is deleted by the server after the swap, never before.
 */
function ReplaceForm({
  trainingId,
  resourceId,
  title,
  onDone,
}: {
  trainingId: string;
  resourceId: string;
  title: string;
  onDone: (message: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [newTitle, setNewTitle] = useState(title);
  const [phase, setPhase] = useState<"idle" | "uploading">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setError("Drop the replacement file first.");
      return;
    }
    setError(null);
    setPhase("uploading");

    const target = await requestTrainingResourceAction({
      trainingId,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      title: newTitle.trim() || file.name,
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
      if (!response.ok) throw new Error(String(response.status));
    } catch {
      setPhase("idle");
      setError("The upload did not finish. Check your connection and try again.");
      return;
    }

    const result = await replaceTrainingResourceAction({
      trainingId,
      resourceId,
      storageKey: target.storageKey,
      mimeType: file.type || "application/octet-stream",
      title: newTitle.trim() || undefined,
    });
    setPhase("idle");
    if (!result.ok) {
      setError(result.message ?? "The file could not be replaced.");
      return;
    }
    onDone(result.message ?? "The file was replaced.");
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-card border border-primary/30 bg-primary/[0.05] p-4">
      <div>
        <p className="flex items-center gap-2 text-sm font-bold text-ink">
          <UploadCloud className="h-4 w-4 text-primary" aria-hidden />
          Replace this file
        </p>
        <p className="mt-1 text-xs leading-relaxed text-ink-muted">
          The wrong upload stays readable until the new one arrives, then it is removed. The attachment keeps its place
          on the training.
        </p>
      </div>

      <div>
        <label htmlFor={`replace-title-${resourceId}`} className={labelClass}>
          What is it?
        </label>
        <input
          id={`replace-title-${resourceId}`}
          value={newTitle}
          onChange={(event) => setNewTitle(event.target.value)}
          className={inputClass}
        />
      </div>

      <FileDrop
        id={`replace-file-${resourceId}`}
        name="file"
        label="Replacement file"
        accept={ACCEPT}
        onFile={setFile}
        hint="Drop the correct file here, or choose it. The same formats as an upload."
      />

      {error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}

      <button type="submit" disabled={phase === "uploading"} aria-busy={phase === "uploading"} className={buttonClass({ size: "sm" })}>
        {phase === "uploading" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <RefreshCw className="h-4 w-4" aria-hidden />}
        {phase === "uploading" ? "Uploading…" : "Replace file"}
      </button>
    </form>
  );
}

/** A handful of attachments as a responsive grid of tiles. */
export function ResourceTiles({
  trainingId,
  trainingTitle,
  resources,
  layout = "tile",
  canEdit = false,
  emptyMessage,
}: {
  trainingId: string;
  trainingTitle?: string;
  resources: ViewableResource[];
  layout?: "tile" | "chip";
  canEdit?: boolean;
  emptyMessage?: string;
}) {
  if (resources.length === 0) {
    return (
      <p className="rounded-card border border-dashed border-hairline bg-surface-2/60 px-4 py-5 text-sm text-ink-muted">
        {emptyMessage ??
          "No files attached yet. A deck, the attendance sheet or a report can be added from the Resources panel below."}
      </p>
    );
  }

  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {resources.map((resource) => (
        <li key={resource.id} className="min-w-0">
          <ResourceTile
            trainingId={trainingId}
            trainingTitle={trainingTitle}
            resource={resource}
            layout={layout}
            canEdit={canEdit}
          />
        </li>
      ))}
    </ul>
  );
}
