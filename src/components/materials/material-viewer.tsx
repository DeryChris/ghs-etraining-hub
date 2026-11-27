import { FileDown } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { FilePreview } from "@/components/materials/file-preview";
import { formatBytes, formatMimeType } from "@/lib/format";
import { previewKindFor } from "@/lib/ghs-constants";

/**
 * The file, opened in the page.
 *
 * A learner should never have to leave the library, find the download folder and
 * hunt for an app to read a protocol. So every accepted format has a way to be
 * read here:
 *
 *  - PDF: the browser's own viewer, framed.
 *  - Image, video, audio: native elements, with the video served by range through
 *    the signed URL so seeking works.
 *  - Word, PowerPoint, Excel: drawn from the file itself in the browser — pages for
 *    a document, the slide canvas for a deck, the grid for a sheet (`file-preview.tsx`).
 *  - Text, Markdown, CSV: shown as text.
 *
 * The download is always present and always the same action, so nothing is
 * trapped inside the card.
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
  const fileHref = `/api/materials/${materialId}/file`;
  const downloadHref = `${fileHref}?download=1`;

  return (
    <section aria-labelledby="file-heading" className="overflow-hidden rounded-card border border-hairline bg-surface shadow-panel">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-5 py-4">
        <div className="min-w-0">
          <h2 id="file-heading" className="text-base font-bold text-ink">
            {kind === "none" ? "File" : "Read it here"}
          </h2>
          <p className="mt-0.5 truncate text-xs text-ink-muted">
            {formatMimeType(mimeType)}
            {sizeBytes ? ` · ${formatBytes(sizeBytes)}` : ""} · Opening and downloading are recorded.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={fileHref} target="_blank" rel="noopener noreferrer" className={buttonClass({ className: "h-10 px-4" })}>
            Open in a tab
          </a>
          <a href={downloadHref} className={buttonClass({ variant: "secondary", className: "h-10 px-4" })}>
            <FileDown className="h-4 w-4" aria-hidden />
            Download
          </a>
        </div>
      </div>

      <FilePreview kind={kind} title={title} fileHref={fileHref} />
    </section>
  );
}
