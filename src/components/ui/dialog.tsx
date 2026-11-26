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
        className={`w-[calc(100vw-1.5rem)] ${width} rounded-card border border-hairline bg-surface p-0 text-ink shadow-2xl backdrop:bg-ink/40 backdrop:backdrop-blur-[2px]`}
      >
        {open && (
          <div className="max-h-[85vh] overflow-y-auto p-6 sm:p-7">
            <div className="mb-5 flex items-start justify-between gap-4">
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

            {typeof children === "function" ? children({ close: () => setOpen(false) }) : children}
          </div>
        )}
      </dialog>
    </>
  );
}
