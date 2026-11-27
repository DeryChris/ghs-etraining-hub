"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, FileDown, Loader2, RefreshCw } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { PptxView } from "@/components/materials/pptx-view";
import { XlsxView } from "@/components/materials/xlsx-view";
import type { Deck } from "@/lib/office/pptx";
import type { Workbook } from "@/lib/office/xlsx";

type OfficeKind = "docx" | "pptx" | "xlsx";

/**
 * Word, PowerPoint and Excel, drawn in the page.
 *
 * The browser will not render OOXML, so this reads the file itself and draws it:
 * a .docx through page-perfect HTML (docx-preview), a .pptx by placing each slide's
 * shapes where the author placed them, an .xlsx as a grid with its own widths,
 * fills and number formats. The bytes come from the file route on this origin —
 * same authorisation as opening the file — and nothing is saved by reading it.
 */
export function OfficeFile({
  kind,
  title,
  fileHref,
  downloadHref,
  expanded = false,
}: {
  kind: OfficeKind;
  title: string;
  fileHref: string;
  downloadHref: string;
  /** Given the whole screen: a deck fills the height it has instead of 16:9 of its width. */
  expanded?: boolean;
}) {
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [deck, setDeck] = useState<Deck | null>(null);
  const [workbook, setWorkbook] = useState<Workbook | null>(null);
  const [attempt, setAttempt] = useState(0);
  const docxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch(fileHref, { credentials: "same-origin" });
        if (!response.ok) throw new Error(`The file could not be fetched (${response.status}).`);
        const bytes = await response.arrayBuffer();
        if (cancelled) return;

        if (kind === "docx") {
          const { renderAsync } = await import("docx-preview");
          const node = docxRef.current;
          if (!node) throw new Error("There was nowhere to draw the document.");
          node.innerHTML = "";
          await renderAsync(bytes, node, node, {
            className: "docx",
            inWrapper: true,
            breakPages: true,
            ignoreWidth: false,
            ignoreHeight: false,
            renderHeaders: true,
            renderFooters: true,
            renderFootnotes: true,
            useBase64URL: true,
          });
        } else if (kind === "pptx") {
          const { readDeck } = await import("@/lib/office/pptx");
          const parsed = await readDeck(bytes);
          if (cancelled) return;
          setDeck(parsed);
        } else {
          const { readWorkbook } = await import("@/lib/office/xlsx");
          const parsed = await readWorkbook(bytes);
          if (cancelled) return;
          setWorkbook(parsed);
        }

        if (!cancelled) setStatus("ready");
      } catch (error) {
        if (cancelled) return;
        setMessage(
          error instanceof Error && error.message
            ? error.message
            : "This file could not be drawn in the page. It may be damaged, or saved in a format this reader does not understand.",
        );
        setStatus("failed");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [kind, fileHref, attempt]);

  if (status === "failed") {
    return (
      <div className="space-y-4 px-5 py-8">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden />
          <div>
            <p className="text-sm font-semibold text-ink">This file could not be drawn here.</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-muted">
              {message} The original is untouched — download it and open it in its own program.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={downloadHref} className={buttonClass({ variant: "secondary", size: "sm" })}>
            <FileDown className="h-4 w-4" aria-hidden />
            Download {title}
          </a>
          <button
            type="button"
            onClick={() => {
              setStatus("loading");
              setMessage(null);
              setAttempt((value) => value + 1);
            }}
            className={buttonClass({ variant: "ghost", size: "sm" })}
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={expanded ? "relative h-full" : "relative"}>
      {status === "loading" && (
        <div className="absolute inset-0 z-10 flex min-h-40 items-center justify-center gap-3 bg-surface/85 text-sm text-ink-muted" aria-live="polite">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Drawing the {kind === "docx" ? "document" : kind === "pptx" ? "slides" : "sheet"}…
        </div>
      )}

      {/* docx-preview draws into this node directly; React never owns its children. */}
      <div ref={docxRef} hidden={kind !== "docx"} className="docx-host bg-surface-2" />

      {kind === "pptx" && deck && (
        <div className={expanded ? "flex h-full min-h-0 flex-col bg-surface-2" : "bg-surface-2 p-4 sm:p-6"}>
          <PptxView deck={deck} expanded={expanded} />
        </div>
      )}

      {kind === "xlsx" && workbook && (
        <div className="bg-surface p-3 sm:p-4">
          <XlsxView workbook={workbook} />
        </div>
      )}
    </div>
  );
}

/** Plain text and Markdown: the bytes, as they are. */
export function TextFile({ fileHref }: { fileHref: string }) {
  const [text, setText] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(fileHref, { credentials: "same-origin" })
      .then((response) => (response.ok ? response.text() : Promise.reject(new Error(String(response.status)))))
      .then((body) => {
        if (!cancelled) setText(body);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [fileHref]);

  if (failed) {
    return (
      <p className="px-5 py-8 text-sm text-ink-muted">
        The text could not be read just now. Download the file to open it.
      </p>
    );
  }

  if (text === null) {
    return (
      <div className="flex items-center gap-3 px-5 py-10 text-sm text-ink-muted" aria-live="polite">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Reading the file…
      </div>
    );
  }

  return (
    <pre className="max-h-[62vh] overflow-auto whitespace-pre-wrap bg-surface px-5 py-5 text-[13px] leading-relaxed text-ink">
      {text}
    </pre>
  );
}
