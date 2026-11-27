"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { buttonClass } from "@/components/ui/button";

export interface FormStep {
  /** Short name, used in the progress rail. */
  title: string;
  /** The one line under the rail: what this step is for. */
  blurb: string;
}

/**
 * A long form, in named steps, with nothing hidden from the server.
 *
 * The complaint was boredom, and the cause was thirteen fields in one undivided
 * grid: a wall with no beginning, no end and no sense of progress. Splitting the
 * form into "the basics", "where and when" and "the record" costs one click and
 * gives people a place to stop, a visible position, and a shorter list in front of
 * them at any moment.
 *
 * Every panel stays mounted — inactive steps are `hidden`, not unmounted — for two
 * reasons: a dropdown whose options were filtered by an earlier answer keeps its
 * state, and the browser still posts every field, so the server sees the whole
 * form. Because a hidden required field cannot be focused, the form runs
 * `noValidate`: on submit this component finds the first invalid control, brings
 * its step into view and only then asks the browser to complain about it.
 */
export function FormSteps({
  steps,
  panels,
  footer,
}: {
  steps: FormStep[];
  panels: ReactNode[];
  /** The submit button — rendered only on the last step. */
  footer: ReactNode;
}) {
  const [index, setIndex] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const last = steps.length - 1;

  /** The step panel that owns a control, or null. */
  function panelOf(element: Element | null): number | null {
    if (!element) return null;
    const panel = element.closest<HTMLElement>("[data-step-panel]");
    return panel ? Number(panel.dataset.stepPanel) : null;
  }

  /** The first control the browser would refuse, anywhere in the scope. */
  function invalidIn(scope: ParentNode): HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null {
    const found = scope.querySelector(":invalid");
    if (
      found instanceof HTMLInputElement ||
      found instanceof HTMLSelectElement ||
      found instanceof HTMLTextAreaElement
    ) {
      return found;
    }
    return null;
  }

  // Validate on submit, across every step, and reveal the step that needs work.
  useEffect(() => {
    const form = wrapRef.current?.closest("form");
    if (!form) return;

    const onSubmit = (event: Event) => {
      if (form.checkValidity()) return;
      event.preventDefault();
      event.stopPropagation();
      const firstBad = invalidIn(form);
      const step = panelOf(firstBad);
      if (step !== null && step !== index) setIndex(step);
      // Wait for the panel to be visible before the browser tries to focus it.
      window.setTimeout(() => firstBad?.reportValidity(), 30);
    };

    form.addEventListener("submit", onSubmit, true);
    return () => form.removeEventListener("submit", onSubmit, true);
  }, [index]);

  function next() {
    const panel = wrapRef.current?.querySelector<HTMLElement>(`[data-step-panel="${index}"]`);
    const bad = panel ? invalidIn(panel) : null;
    if (bad) {
      bad.reportValidity();
      bad.focus();
      return;
    }
    setIndex((current) => Math.min(current + 1, last));
  }

  const step = steps[index];

  return (
    <div ref={wrapRef} className="space-y-5">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-2" aria-label="Form steps">
        {steps.map((entry, position) => {
          const active = position === index;
          const done = position < index;
          return (
            <li key={entry.title} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIndex(position)}
                aria-current={active ? "step" : undefined}
                className={`inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-xs font-semibold transition-colors ${
                  active
                    ? "border-primary bg-primary text-primary-ink"
                    : done
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-hairline bg-surface text-ink-muted hover:border-primary/40 hover:text-ink"
                }`}
              >
                <span
                  className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                    active ? "bg-primary-ink/20 text-primary-ink" : done ? "bg-primary/15 text-primary" : "bg-surface-2 text-ink-muted"
                  }`}
                >
                  {done ? <Check className="h-3 w-3" aria-hidden /> : position + 1}
                </span>
                {entry.title}
              </button>
              {position < last && <span aria-hidden className="hidden h-px w-6 bg-hairline sm:block" />}
            </li>
          );
        })}
      </ol>

      <div className="h-1 w-full overflow-hidden rounded-full bg-surface-2" aria-hidden>
        <div
          className="h-1 rounded-full bg-primary transition-[width] duration-300"
          style={{ width: `${((index + 1) / steps.length) * 100}%` }}
        />
      </div>

      {panels.map((panel, position) => (
        <div key={steps[position].title} data-step-panel={position} hidden={position !== index} className="space-y-4">
          {panel}
        </div>
      ))}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-4">
        <p className="text-xs text-ink-muted">
          Step {index + 1} of {steps.length} · {step.blurb}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {index > 0 && (
            <button type="button" onClick={() => setIndex((current) => Math.max(0, current - 1))} className={buttonClass({ variant: "ghost", size: "sm" })}>
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Back
            </button>
          )}
          {index < last ? (
            <button type="button" onClick={next} className={buttonClass({ variant: "primary", size: "sm" })}>
              Next
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          ) : (
            footer
          )}
        </div>
      </div>
    </div>
  );
}
