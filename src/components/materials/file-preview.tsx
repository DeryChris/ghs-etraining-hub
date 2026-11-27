import { FileDown } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { OfficeFile, TextFile } from "@/components/materials/office-file";
import type { PreviewKind } from "@/lib/ghs-constants";

/**
 * The file itself, drawn in the page — the one renderer for every viewer.
 *
 * The rule is that a file looks like the file, not like a description of one:
 *
 *  - **PDF** goes through the browser's own viewer (the same engine Acrobat and
 *    Chrome use), so pagination, fonts, figures and links are the document's own.
 *  - **Images, video, audio** are native elements, served with range support so a
 *    recording can be scrubbed rather than downloaded whole.
 *  - **Word, PowerPoint, Excel** are drawn from the OOXML by `office-file.tsx`:
 *    pages for a .docx, the slide canvas for a .pptx, the grid for an .xlsx.
 *  - **Plain text**, Markdown and CSV are shown as text.
 *
 * A file that cannot be drawn says so plainly with the download beside it — the
 * original is never trapped behind a viewer that gave up.
 */
export function FilePreview({
  kind,
  title,
  fileHref,
  className = "",
  expanded = false,
}: {
  kind: PreviewKind;
  title: string;
  /** Inline URL: streams the bytes with the right content type. */
  fileHref: string;
  className?: string;
  /** Given the whole screen by the panel around it: fill it instead of 72vh. */
  expanded?: boolean;
}) {
  const downloadHref = `${fileHref}${fileHref.includes("?") ? "&" : "?"}download=1`;
  const tall = expanded ? "h-full" : "h-[72vh]";

  if (kind === "pdf") {
    return (
      <div className={`bg-surface-2 ${expanded ? "h-full" : ""} ${className}`}>
        <object
          data={`${fileHref}#view=FitH`}
          type="application/pdf"
          className={`${tall} w-full`}
          aria-label={`${title} (PDF)`}
        >
          <div className="px-5 py-8">
            <p className="text-sm text-ink-muted">
              This browser cannot show a PDF inline.{" "}
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
      <div className={`flex items-center justify-center bg-surface-2 ${expanded ? "h-full p-0" : "p-4"} ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- a signed, redirect-backed URL; next/image cannot optimise a redirect */}
        <img
          src={fileHref}
          alt={title}
          className={`mx-auto w-auto max-w-full object-contain ${expanded ? "max-h-full" : "max-h-[72vh] rounded-control"}`}
        />
      </div>
    );
  }

  if (kind === "video") {
    return (
      <div className={`bg-black ${expanded ? "h-full" : ""} ${className}`}>
        <video controls preload="metadata" src={fileHref} className={`w-full ${expanded ? "max-h-full" : "max-h-[72vh]"}`}>
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

  if (kind === "docx" || kind === "pptx" || kind === "xlsx") {
    return (
      <div className={`${expanded ? "h-full" : ""} ${className}`}>
        <OfficeFile kind={kind} title={title} fileHref={fileHref} downloadHref={downloadHref} expanded={expanded} />
      </div>
    );
  }

  if (kind === "text") {
    return (
      <div className={className}>
        <TextFile fileHref={fileHref} />
      </div>
    );
  }

  return (
    <div className={`px-5 py-8 ${className}`}>
      <p className="text-sm text-ink-muted">There is no in-page view for this file type. Download it to open it.</p>
      <a href={downloadHref} className={buttonClass({ variant: "secondary", size: "sm", className: "mt-3" })}>
        <FileDown className="h-4 w-4" aria-hidden />
        Download {title}
      </a>
    </div>
  );
}
