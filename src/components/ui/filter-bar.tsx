import Link from "next/link";
import { ChevronDown, Search } from "lucide-react";
import type { ReactNode } from "react";
import { buttonClass } from "@/components/ui/button";
import { inputClass } from "@/components/ui/input";

export interface FilterBarProps {
  action: string;
  /** The form's accessible name: "Filter trainings". */
  label: string;
  searchName: string;
  searchValue?: string;
  searchPlaceholder: string;
  /** How many of the collapsible fields are set — shown on the summary. */
  activeCount: number;
  /** Where "Clear" goes when something is set. */
  clearHref: string;
  /** The sentence on the right: "Showing 1–25 of 4,182". */
  summary?: ReactNode;
  children: ReactNode;
}

/**
 * One search box, with the rest of the filters behind a toggle.
 *
 * A filter panel is used twice: on the way *in* (one word, Enter) and on the way
 * *through* (a year, a region, a status). Drawing all eight fields every time
 * charged the first case for the second: on the trainings list the panel was
 * taller than the first three results, and on a phone it filled the screen before
 * a single training appeared.
 *
 * The key box stays. Everything else is inside a native `<details>` — the fields
 * keep their values and are still submitted when it is shut, because they remain
 * in the DOM — and the toggle says how many are set, so a filtered list never
 * looks unfiltered. No JavaScript is involved, so it works before hydration and
 * survives a broken bundle.
 */
export function FilterBar({
  action,
  label,
  searchName,
  searchValue,
  searchPlaceholder,
  activeCount,
  clearHref,
  summary,
  children,
}: FilterBarProps) {
  return (
    <form
      action={action}
      method="get"
      role="search"
      aria-label={label}
      className="rounded-card border border-hairline bg-surface p-3 shadow-panel sm:p-4"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden />
          <input
            id={`${searchName}-search`}
            name={searchName}
            type="search"
            defaultValue={searchValue}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className={`${inputClass} h-11 pl-10`}
          />
        </div>
        <button type="submit" className={buttonClass({ className: "h-11 shrink-0 px-5" })}>
          Search
        </button>
      </div>

      <details open={activeCount > 0} className="group mt-2">
        <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-control px-1 py-1.5 text-[13px] font-semibold text-ink-muted transition-colors hover:text-ink [&::-webkit-details-marker]:hidden">
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden />
          More filters
          {activeCount > 0 && (
            <span className="rounded-full bg-primary px-1.5 text-[11px] font-bold leading-5 text-primary-ink">
              {activeCount}
              <span className="sr-only"> set</span>
            </span>
          )}
        </summary>

        <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
      </details>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-hairline pt-3">
        <button type="submit" className={buttonClass({ variant: "secondary", size: "sm" })}>
          Apply filters
        </button>
        {activeCount > 0 && (
          <Link href={clearHref} className={buttonClass({ variant: "ghost", size: "sm" })}>
            Clear
          </Link>
        )}
        {summary && (
          <p className="ml-auto text-xs text-ink-muted" aria-live="polite">
            {summary}
          </p>
        )}
      </div>
    </form>
  );
}
