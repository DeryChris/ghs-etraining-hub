"use client";

import { useState } from "react";
import {
  Download,
  ExternalLink,
  File as FileIcon,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Loader2,
  Music,
  PlayCircle,
  Presentation,
  type LucideIcon,
} from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { buttonClass } from "@/components/ui/button";
import { FilePreview } from "@/components/materials/file-preview";
import { formatBytes, formatMimeType } from "@/lib/format";
import { previewKindFor, type PreviewKind } from "@/lib/ghs-constants";
import type { OfficePreview } from "@/lib/server/office-preview";

export interface ViewableResource {
  id: string;
  title: string;
  mimeType: string | null;
  sizeBytes: number | null;
}

type PreviewPayload = {
  office: OfficePreview | null;
  text: string | null;
  error: string | null;
};

type PreviewState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; payload: PreviewPayload }
  | { status: "failed"; message: string };

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

/** The formats the server has to read before the browser can show them. */
const NEEDS_SERVER = new Set<PreviewKind>(["docx", "pptx", "xlsx", "text"]);

function fileHref(trainingId: string, resourceId: string) {
  return `/api/trainings/${trainingId}/resources/${resourceId}/file`;
}

/**
 * One attached file: read it in the page, keep it only if you mean to.
 *
 * Clicking the tile used to download the file — a click meant "show me" far more
 * often than it meant "save this", and on a phone the difference is a lost page
 * and a file manager. So the click opens the file in a wide overlay with the
 * browser's own renderer (PDF, image, video, audio) or the server's reading view
 * (Word, PowerPoint, Excel, text), an expand control that gives it the whole
 * screen, and a Download button that is the only thing that saves anything.
 */
export function ResourceTile({
  trainingId,
  resource,
  layout = "tile",
}: {
  trainingId: string;
  resource: ViewableResource;
  /** `tile` for grids and the library panel, `chip` for a row of attachments. */
  layout?: "tile" | "chip";
}) {
  const [state, setState] = useState<PreviewState>({ status: "idle" });
  const kind = previewKindFor(resource.mimeType);
  const Icon = ICON_BY_KIND[kind];
  const inline = fileHref(trainingId, resource.id);
  const downloadHref = `${inline}?download=1`;
  const title = resource.title.trim().length > 0 ? resource.title : "Attachment";

  function load() {
    if (!NEEDS_SERVER.has(kind) || state.status === "loading" || state.status === "ready") return;
    setState({ status: "loading" });
    fetch(`/api/trainings/${trainingId}/resources/${resource.id}/preview`, { credentials: "same-origin" })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
      .then((payload: { office?: OfficePreview | null; text?: string | null; error?: string | null }) => {
        setState({
          status: "ready",
          payload: { office: payload.office ?? null, text: payload.text ?? null, error: payload.error ?? null },
        });
      })
      .catch(() => setState({ status: "failed", message: "This file could not be read just now. You can still download it." }));
  }

  /*
   * The click does both jobs: open the overlay, and (for a format the browser
   * cannot render by itself) start the server reading it. The button itself
   * carries the handler rather than a wrapper, so there is one click path and no
   * stray element between the tile and the grid that owns its width.
   */
  function renderTrigger(open: () => void) {
    const onClick = () => {
      open();
      load();
    };

    return layout === "chip" ? (
      <button
        type="button"
        onClick={onClick}
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
        <span className="shrink-0 text-ink-muted transition-colors group-hover:text-primary">
          <ExternalLink className="h-4 w-4" aria-hidden />
          <span className="sr-only">Open {title}</span>
        </span>
      </button>
    ) : (
      <button
        type="button"
        onClick={onClick}
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
          <span className="ml-auto text-xs text-ink-muted">Reading opens the file; only Download saves it.</span>
        </div>

        <div className="overflow-hidden rounded-card border border-hairline">
          {state.status === "loading" ? (
            <div className="flex items-center gap-3 px-5 py-10 text-sm text-ink-muted" aria-live="polite">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Reading the file…
            </div>
          ) : state.status === "failed" ? (
            <div className="space-y-3 px-5 py-8">
              <p role="alert" className="text-sm font-medium text-danger">
                {state.message}
              </p>
              <a href={downloadHref} className={buttonClass({ variant: "secondary", size: "sm" })}>
                <Download className="h-4 w-4" aria-hidden />
                Download {title}
              </a>
            </div>
          ) : (
            <FilePreview
              kind={kind}
              title={title}
              fileHref={inline}
              office={state.status === "ready" ? state.payload.office : null}
              text={state.status === "ready" ? state.payload.text : null}
              error={state.status === "ready" ? state.payload.error : null}
            />
          )}
        </div>
      </div>
    </Dialog>
  );
}

/** A handful of attachments as a responsive grid of tiles. */
export function ResourceTiles({
  trainingId,
  resources,
  layout = "tile",
}: {
  trainingId: string;
  resources: ViewableResource[];
  layout?: "tile" | "chip";
}) {
  if (resources.length === 0) {
    return (
      <p className="rounded-card border border-dashed border-hairline bg-surface-2/60 px-4 py-5 text-sm text-ink-muted">
        No files attached yet. A deck, the attendance sheet or a report can be added from the Resources panel below.
      </p>
    );
  }

  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {resources.map((resource) => (
        <li key={resource.id} className="min-w-0">
          <ResourceTile trainingId={trainingId} resource={resource} layout={layout} />
        </li>
      ))}
    </ul>
  );
}
