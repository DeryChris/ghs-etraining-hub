import type { ReactNode } from "react";
import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";

/*
 * Charts are hand-built SVG on the server. No charting library ships to the
 * browser: the whole insights page stays a document, which is the only thing
 * that works on a metered phone in Wa East. Each chart also renders its numbers
 * as text — inside a <details> for sighted users who want the figures, and in a
 * visually-hidden table for assistive technology — because a picture of a number
 * is not a number.
 */

export interface Series {
  label: string;
  /** CSS colour reference, e.g. `var(--chart-1)`. */
  color: string;
}

export const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-8)",
] as const;

export function chartColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length];
}

export function ChartCard({
  title,
  description,
  series,
  children,
  table,
  actions,
  className,
}: {
  title: string;
  description?: string;
  series?: Series[];
  children: ReactNode;
  /** The same data as rows, for the "numbers" disclosure and screen readers. */
  table: { head: string[]; rows: (string | number)[][] };
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-card border border-hairline bg-surface p-5 shadow-panel", className)} aria-label={title}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-ink">{title}</h2>
          {description && <p className="mt-1 text-sm leading-relaxed text-ink-muted">{description}</p>}
        </div>
        {actions}
      </div>

      {series && series.length > 1 && (
        <ul className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
          {series.map((item) => (
            <li key={item.label} className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} aria-hidden />
              {item.label}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4">{children}</div>

      <details className="mt-4 border-t border-hairline/60 pt-3">
        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
          The numbers
        </summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">{title} data table</caption>
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.12em] text-ink-muted">
                {table.head.map((cell) => (
                  <th key={cell} scope="col" className="py-1.5 pr-4 font-semibold">
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, index) => (
                <tr key={index} className="border-t border-hairline/50">
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="py-1.5 pr-4 tabular-nums text-ink">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}

export function EmptyChart({ message }: { message: string }) {
  return (
    <div role="status" className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-control border border-dashed border-hairline bg-surface-2 px-6 py-8 text-center text-sm text-ink-muted">
      <span className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary" aria-hidden>
        <Activity className="h-5 w-5" />
      </span>
      <p className="max-w-[42ch] leading-relaxed">{message}</p>
    </div>
  );
}
