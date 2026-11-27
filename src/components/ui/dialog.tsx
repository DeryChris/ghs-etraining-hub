"use client";

import { X } from "lucide-react";
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
}: {
  trigger: (props: { open: () => void; expanded: boolean }) => ReactNode;
  title: string;
  description?: string;
  children: ReactNode | ((props: { close: () => void }) => ReactNode);
  size?: "sm" | "md" | "lg";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
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

  const width = size === "sm" ? "max-w-md" : size === "lg" ? "max-w-3xl" : "max-w-xl";

  return (
    <>
      {trigger({ open: () => setOpen(true), expanded: open })}

      <dialog
        ref={ref}
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        onClose={() => setOpen(false)}
        onClick={(event) => {
          // A click on the backdrop lands on the dialog element itself.
          if (event.target === ref.current) setOpen(false);
        }}
        className={`m-auto w-[calc(100vw-1.5rem)] ${width} max-h-[calc(100dvh-2rem)] overflow-hidden rounded-card border border-hairline bg-surface p-0 text-ink shadow-2xl backdrop:bg-ink/45 backdrop:backdrop-blur-[3px]`}
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
          <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
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
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="-mr-1 -mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <div className="overlay-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5 pb-7 sm:px-7">
              {typeof children === "function" ? children({ close: () => setOpen(false) }) : children}
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
