"use client";

import { Maximize2, Minimize2, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

/**
 * An on-page overlay instead of a new route.
 *
 * Built on `<dialog>` so the browser supplies what a hand-rolled modal gets
 * wrong: focus trapping, Escape to close, `aria-modal`, and placing the rest of
 * the page behind an inert backdrop. `showModal()` also stops the body scrolling,
 * which is what makes a long form feel like a panel rather than a jump.
 *
 * The trigger is passed in as `trigger`, so a caller keeps its own button
 * styling and this component owns nothing but the overlay.
 */
export function Dialog({
  trigger,
  title,
  description,
  children,
  size = "md",
  allowFullscreen = false,
  bodyClassName,
}: {
  trigger: (props: { open: () => void; expanded: boolean }) => ReactNode;
  title: string;
  description?: string;
  children: ReactNode | ((props: { close: () => void }) => ReactNode);
  size?: "sm" | "md" | "lg" | "xl";
  /** Adds an expand control: the panel becomes the whole screen, Escape leaves it. */
  allowFullscreen?: boolean;
  /** Overrides the body padding — a file viewer wants the frame, not a form's margins. */
  bodyClassName?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  /**
   * Browser full screen is not available everywhere — iOS Safari has no
   * `requestFullscreen` for anything but `<video>` — so a refusal used to make
   * this button do nothing at all. Instead the panel fills the viewport with
   * CSS, which is what the visitor asked for anyway.
   */
  const [filled, setFilled] = useState(false);

  /*
   * The browser owns full screen when it offers it: the `fullscreenchange` event
   * is the only truth about whether it worked (a denied request, an Escape key
   * and a gesture all end here). The CSS removes the panel's own frame in either
   * state, so the file gets the screen.
   */
  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === ref.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const expanded = fullscreen || filled;

  async function toggleFullscreen() {
    const dialog = ref.current;
    if (!dialog) return;
    if (filled) {
      setFilled(false);
      return;
    }
    if (document.fullscreenElement === dialog) {
      try {
        await document.exitFullscreen();
      } catch {
        // Already out; nothing to undo.
      }
      return;
    }
    try {
      if (typeof dialog.requestFullscreen !== "function") throw new Error("unsupported");
      await dialog.requestFullscreen();
    } catch {
      setFilled(true);
    }
  }
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // `showModal()` blocks clicks on the page behind, but not wheel or touch
  // scrolling in every browser — the list underneath would still slide while
  // somebody scrolls a long form. Lock the document while the panel is open and
  // leave the page where it was when it closes.
  useEffect(() => {
    if (!open) return;
    const { body, documentElement } = document;
    const previousBody = body.style.overflow;
    const previousHtml = documentElement.style.overflow;
    const previousPad = body.style.paddingRight;
    // Compensate for the vanishing scrollbar so the layout does not jump.
    const gutter = window.innerWidth - documentElement.clientWidth;
    body.style.overflow = "hidden";
    documentElement.style.overflow = "hidden";
    if (gutter > 0) body.style.paddingRight = `${gutter}px`;
    return () => {
      body.style.overflow = previousBody;
      documentElement.style.overflow = previousHtml;
      body.style.paddingRight = previousPad;
    };
  }, [open]);

  const width = size === "sm" ? "max-w-md" : size === "lg" ? "max-w-3xl" : size === "xl" ? "max-w-6xl" : "max-w-xl";

  return (
    <>
      {trigger({ open: () => setOpen(true), expanded: open })}

      <dialog
        ref={ref}
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        onClose={() => {
          setOpen(false);
          // Reopen at the panel's own size, not the last visitor's full screen.
          setFilled(false);
        }}
        onClick={(event) => {
          // A click on the backdrop lands on the dialog element itself.
          if (event.target === ref.current) setOpen(false);
        }}
        className={`overlay-panel ${expanded ? "overlay-panel-filled" : `m-auto w-[calc(100vw-1.5rem)] ${width} max-h-[calc(100dvh-2rem)] rounded-card border border-hairline shadow-2xl`} overflow-hidden bg-surface p-0 text-ink backdrop:bg-ink/45 backdrop:backdrop-blur-[3px]`}
      >
        {open && (
          /*
           * Header, then a scrolling body — never one long scroll region.
           *
           * The title used to scroll away with the form, so a panel long enough to
           * need a bar (every edit form on the geography page) lost the one line
           * saying which record was being changed. The body scrolls inside its own
           * inset track (`.overlay-scroll`), so the bar stops short of the rounded
           * corners instead of cutting across them.
           */
          <div className={`flex flex-col ${expanded ? "h-[100dvh] max-h-[100dvh]" : "max-h-[calc(100dvh-2rem)]"}`}>
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-hairline px-6 py-4 sm:px-7">
              <div className="space-y-1">
                <h2 id={titleId} className="text-lg font-bold text-ink">
                  {title}
                </h2>
                {description && (
                  <p id={descriptionId} className="text-sm leading-relaxed text-ink-muted">
                    {description}
                  </p>
                )}
              </div>
              {allowFullscreen && (
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  aria-label={expanded ? "Leave full screen" : "Full screen"}
                  title={expanded ? "Leave full screen" : "Full screen"}
                  className="-mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  {expanded ? <Minimize2 className="h-4 w-4" aria-hidden /> : <Maximize2 className="h-4 w-4" aria-hidden />}
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="-mr-1 -mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <div
              className={
                bodyClassName ??
                "overlay-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5 pb-7 sm:px-7"
              }
            >
              {typeof children === "function" ? children({ close: () => setOpen(false) }) : children}
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
