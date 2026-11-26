import { FileDown, FileWarning, Presentation, Sheet, Table2 } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { formatBytes, formatMimeType } from "@/lib/format";
import { previewKindFor } from "@/lib/ghs-constants";
import type { OfficePreview } from "@/lib/server/office-preview";

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
 *  - Word, PowerPoint, Excel: text and tables extracted on the server (`office-preview.ts`)
 *    — a reading view, with the original one click away because layout belongs to
 *    the file, not to the library.
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
  office,
  text,
  error,
}: {
  materialId: string;
  title: string;
  mimeType: string | null;
  sizeBytes?: number | null;
  office?: OfficePreview | null;
  /** Already-read text for text/markdown/csv items. */
  text?: string | null;
  /** Why the in-page view is not showing, when it is not. */
  error?: string | null;
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

      {error ? (
        <div className="flex items-start gap-3 px-5 py-8">
          <FileWarning className="mt-0.5 h-5 w-5 shrink-0 text-warn" aria-hidden />
          <div>
            <p className="text-sm font-semibold text-ink">This file could not be opened here.</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-muted">{error}</p>
            <a href={downloadHref} className={buttonClass({ variant: "secondary", className: "mt-3 h-10 px-4" })}>
              Download {title}
            </a>
          </div>
        </div>
      ) : kind === "pdf" ? (
        <div className="bg-surface-2">
          <object data={fileHref} type="application/pdf" className="h-[78vh] w-full" aria-label={`${title} (PDF)`}>
            <div className="px-5 py-8">
              <p className="text-sm text-ink-muted">
                Your browser cannot show a PDF inline.{" "}
                <a href={fileHref} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline underline-offset-4">
                  Open it in a new tab
                </a>{" "}
                or download it above.
              </p>
            </div>
          </object>
        </div>
      ) : kind === "image" ? (
        <div className="bg-surface-2 p-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- signed, redirect-backed URL; next/image cannot optimise a redirect */}
          <img src={fileHref} alt={`${title} — image attached to this material`} className="mx-auto max-h-[78vh] w-auto rounded-control" />
        </div>
      ) : kind === "video" ? (
        <div className="bg-black">
          {/* A signed URL that honours Range, so the scrubber works on a large file. */}
          <video controls preload="metadata" src={fileHref} className="aspect-video w-full">
            <track kind="captions" />
          </video>
          <p className="px-4 py-2 text-xs text-ink-muted">Captions are not attached to this recording.</p>
        </div>
      ) : kind === "audio" ? (
        <div className="px-5 py-6">
          <audio controls preload="metadata" src={fileHref} className="w-full" />
          <p className="mt-2 text-xs text-ink-muted">A recording from the session.</p>
        </div>
      ) : kind === "docx" && office?.blocks ? (
        <article className="px-6 py-7 sm:px-10">
          {office.blocks.map((block, index) =>
            block.kind === "heading" ? (
              <h3 key={index} className="mt-6 text-lg font-extrabold leading-snug text-ink first:mt-0">
                {block.text}
              </h3>
            ) : block.kind === "bullet" ? (
              <p key={index} className="mt-1.5 flex gap-2 text-[15px] leading-relaxed text-ink">
                <span aria-hidden className="mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                <span>{block.text}</span>
              </p>
            ) : (
              <p key={index} className="mt-3 text-[15px] leading-relaxed text-ink">
                {block.text}
              </p>
            ),
          )}
        </article>
      ) : kind === "pptx" && office?.slides ? (
        <div className="space-y-4 bg-surface-2 p-4 sm:p-6">
          {office.slides.map((slide) => (
            <article key={slide.number} className="rounded-card border border-hairline bg-surface p-5 shadow-panel">
              <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-ink-muted">
                <Presentation className="h-3.5 w-3.5" aria-hidden />
                Slide {slide.number}
              </p>
              {slide.lines.length === 0 ? (
                <p className="mt-2 text-sm italic text-ink-muted">An image-only slide.</p>
              ) : (
                <>
                  <h3 className="mt-2 text-lg font-bold leading-snug text-ink">{slide.lines[0]}</h3>
                  {slide.lines.length > 1 && (
                    <ul className="mt-2 space-y-1.5">
                      {slide.lines.slice(1).map((line, index) => (
                        <li key={index} className="flex gap-2 text-sm leading-relaxed text-ink">
                          <span aria-hidden className="mt-[0.5em] h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </article>
          ))}
        </div>
      ) : kind === "xlsx" && office?.sheets ? (
        <div className="space-y-6 p-4 sm:p-6">
          {office.sheets.map((sheet) => (
            <div key={sheet.name}>
              <p className="mb-2 flex items-center gap-2 text-sm font-bold text-ink">
                <Sheet className="h-4 w-4 text-primary" aria-hidden />
                {sheet.name}
                <span className="text-xs font-medium text-ink-muted">
                  {sheet.rows.length} {sheet.rows.length === 1 ? "row" : "rows"}
                </span>
              </p>
              {sheet.rows.length === 0 ? (
                <p className="text-sm italic text-ink-muted">This sheet is empty.</p>
              ) : (
                <div className="overflow-x-auto rounded-control border border-hairline">
                  <table className="w-full border-collapse text-sm">
                    <tbody>
                      {sheet.rows.map((row, rowIndex) => (
                        <tr key={rowIndex} className={rowIndex === 0 ? "bg-surface-2 font-semibold" : "odd:bg-surface even:bg-surface-2/60"}>
                          {row.map((cell, cellIndex) => (
                            <td key={cellIndex} className="whitespace-nowrap border-b border-hairline px-3 py-1.5 text-ink">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {sheet.truncated && <p className="mt-1.5 text-xs text-ink-muted">Showing the first rows only. Download for the whole sheet.</p>}
            </div>
          ))}
        </div>
      ) : kind === "text" && typeof text === "string" ? (
        <div className="px-5 py-6">
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            <Table2 className="h-3.5 w-3.5" aria-hidden />
            Text
          </p>
          <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap rounded-control bg-surface-2 p-4 text-[13px] leading-relaxed text-ink">
            {text}
          </pre>
        </div>
      ) : (
        <div className="px-5 py-8">
          <p className="text-sm text-ink-muted">This file cannot be shown in the page. Use the download above.</p>
        </div>
      )}

      {office?.notes?.length ? (
        <p className="border-t border-hairline px-5 py-3 text-xs leading-relaxed text-ink-muted">{office.notes.join(" ")}</p>
      ) : null}
    </section>
  );
}
