"use client";

import { Download, ExternalLink, FileText, Maximize2, Minimize2 } from "lucide-react";
import { FilePreview } from "@/components/materials/file-preview";
import { useExpand } from "@/components/ui/use-expand";
import { formatBytes, formatMimeType } from "@/lib/format";
import { previewKindFor } from "@/lib/ghs-constants";

/**
 * The file, opened in the page — and nothing around it.
 *
 * A learner should never have to leave the library, find the download folder and
 * hunt for an app to read a document. So every accepted format has a way to be
 * read here:
 *
 *  - PDF: the browser's own viewer, framed.
 *  - Image, video, audio: native elements, with the video served by range through
 *    the signed URL so seeking works.
 *  - Word, PowerPoint, Excel: drawn from the file itself in the browser — pages for
 *    a document, the slide canvas for a deck, the grid for a sheet (`file-preview.tsx`).
 *  - Text, Markdown, CSV: shown as text.
 *
 * The frame is a strip of icons, not a paragraph: what the file is on the left,
 * three actions on the right, and the whole rest of the card is the file. That is
 * deliberate — on a 375 px screen every line of chrome above the document is a
 * line of the document the reader does not get.
 *
 * Expanding is CSS-first (`use-expand.ts`), because iOS Safari has no
 * `requestFullscreen` for anything but video and the browser's version of this
 * button therefore did nothing on a phone.
 */
export function MaterialViewer({
  materialId,
  title,
  mimeType,
  sizeBytes,
}: {
  materialId: string;
  title: string;
  mimeType: string | null;
  sizeBytes?: number | null;
}) {
  const kind = previewKindFor(mimeType);
  const { ref, expanded, toggle } = useExpand<HTMLElement>();
  const fileHref = `/api/materials/${materialId}/file`;
  const downloadHref = `${fileHref}?download=1`;

  return (
    <section
      ref={ref}
      aria-labelledby="file-heading"
      className={
        expanded
          ? "fixed inset-0 z-[70] flex h-[100dvh] flex-col overflow-hidden bg-surface"
          : "overflow-hidden rounded-card border border-hairline bg-surface shadow-panel"
      }
    >
      <h2 id="file-heading" className="sr-only">
        The file
      </h2>

      <div className="flex shrink-0 items-center gap-2 border-b border-hairline px-3 py-2 sm:px-4">
        <FileText className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden />
        <p className="min-w-0 flex-1 truncate text-xs font-medium text-ink-muted">
          {formatMimeType(mimeType)}
          {sizeBytes ? ` · ${formatBytes(sizeBytes)}` : ""}
        </p>

        <a
          href={fileHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open in a new tab"
          title="Open in a new tab"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <ExternalLink className="h-4 w-4" aria-hidden />
        </a>
        <a
          href={downloadHref}
          aria-label="Download"
          title="Download"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <Download className="h-4 w-4" aria-hidden />
        </a>
        <button
          type="button"
          onClick={toggle}
          aria-label={expanded ? "Leave full screen" : "Full screen"}
          title={expanded ? "Leave full screen" : "Full screen"}
          aria-pressed={expanded}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {expanded ? <Minimize2 className="h-4 w-4" aria-hidden /> : <Maximize2 className="h-4 w-4" aria-hidden />}
        </button>
      </div>

      <div className={expanded ? "min-h-0 flex-1 overflow-auto" : undefined}>
        <FilePreview kind={kind} title={title} fileHref={fileHref} expanded={expanded} />
      </div>
    </section>
  );
}
