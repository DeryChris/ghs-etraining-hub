import { Presentation, Sheet, Table2 } from "lucide-react";
import type { PreviewKind } from "@/lib/ghs-constants";
import type { OfficePreview } from "@/lib/server/office-preview";

/**
 * The file itself, drawn in the page — the one renderer for every viewer.
 *
 * Formats fall into three groups:
 *
 *  - **The browser's own**: PDF (framed), image, video (served by range so the
 *    scrubber works), audio.
 *  - **Read on the server**: Word, PowerPoint and Excel become text, slides and
 *    tables through `office-preview.ts`, because no browser will render them.
 *  - **Plain text**: Markdown, CSV and the like, shown as they are.
 *
 * A file it cannot draw is stated plainly with the download beside it — the
 * original is never trapped behind a viewer that gave up.
 */
export function FilePreview({
  kind,
  title,
  fileHref,
  office,
  text,
  error,
  className = "",
}: {
  kind: PreviewKind;
  title: string;
  /** Inline URL: streams the bytes with the right content type. */
  fileHref: string;
  office?: OfficePreview | null;
  text?: string | null;
  error?: string | null;
  className?: string;
}) {
  if (error) {
    return (
      <div className={`flex items-start gap-3 px-5 py-8 ${className}`}>
        <div>
          <p className="text-sm font-semibold text-ink">This file cannot be read in the page.</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-muted">{error}</p>
        </div>
      </div>
    );
  }

  if (kind === "pdf") {
    return (
      <div className={`bg-surface-2 ${className}`}>
        <object data={fileHref} type="application/pdf" className="h-[70vh] w-full" aria-label={`${title} (PDF)`}>
          <div className="px-5 py-8">
            <p className="text-sm text-ink-muted">
              Your browser cannot show a PDF inline.{" "}
              <a
                href={fileHref}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-primary underline underline-offset-4"
              >
                Open it in a new tab
              </a>{" "}
              or download it.
            </p>
          </div>
        </object>
      </div>
    );
  }

  if (kind === "image") {
    return (
      <div className={`flex items-center justify-center bg-surface-2 p-4 ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- a signed, redirect-backed URL; next/image cannot optimise a redirect */}
        <img src={fileHref} alt={title} className="mx-auto max-h-[70vh] w-auto rounded-control" />
      </div>
    );
  }

  if (kind === "video") {
    return (
      <div className={`bg-black ${className}`}>
        <video controls preload="metadata" src={fileHref} className="max-h-[70vh] w-full">
          <track kind="captions" />
        </video>
        <p className="px-4 py-2 text-xs text-ink-muted">Captions are not attached to this recording.</p>
      </div>
    );
  }

  if (kind === "audio") {
    return (
      <div className={`px-5 py-6 ${className}`}>
        <audio controls preload="metadata" src={fileHref} className="w-full" />
        <p className="mt-2 text-xs text-ink-muted">A recording from the session.</p>
      </div>
    );
  }

  if (kind === "docx" && office?.blocks) {
    return (
      <article className={`px-6 py-7 sm:px-10 ${className}`}>
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
    );
  }

  if (kind === "pptx" && office?.slides) {
    return (
      <div className={`space-y-4 bg-surface-2 p-4 sm:p-6 ${className}`}>
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
    );
  }

  if (kind === "xlsx" && office?.sheets) {
    return (
      <div className={`space-y-6 p-4 sm:p-6 ${className}`}>
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
            {sheet.truncated && (
              <p className="mt-1.5 text-xs text-ink-muted">Showing the first rows only. Download for the whole sheet.</p>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (kind === "text" && typeof text === "string") {
    return (
      <div className={`px-5 py-6 ${className}`}>
        <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
          <Table2 className="h-3.5 w-3.5" aria-hidden />
          Text
        </p>
        <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-control bg-surface-2 p-4 text-[13px] leading-relaxed text-ink">
          {text}
        </pre>
      </div>
    );
  }

  return (
    <div className={`px-5 py-8 ${className}`}>
      <p className="text-sm text-ink-muted">There is no in-page view for this file type. Download it to open it.</p>
    </div>
  );
}
