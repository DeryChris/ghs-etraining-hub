import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A headline number with its trend drawn beside it.
 *
 * The colour is the series' own (materials, downloads, trainings…) rather than a
 * red/green judgement: a fall in "awaiting review" is good news, so the arrow
 * carries the direction and the label says what moved. Nothing is compared that
 * has no earlier period to compare with — an invented "+0%" is worse than no
 * figure at all.
 */

export interface KpiCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  /** Text under the number, e.g. "of 42 staff". */
  hint?: string;
  /** Percentage change against the previous period. Omit when there is none. */
  delta?: number | null;
  /** Points for the sparkline — same period as the headline number. */
  spark?: number[];
  /** CSS colour for the icon chip, sparkline and accent. */
  color: string;
  className?: string;
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null;
  const width = 120;
  const height = 36;
  const max = Math.max(1, ...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * width;
    const y = height - ((value - min) / span) * (height - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const id = `spark-${color.replace(/[^a-z0-9]/gi, "")}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-9 w-[120px]" aria-hidden focusable="false">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${height} ${points.join(" ")} ${width},${height}`} fill={`url(#${id})`} />
      <polyline points={points.join(" ")} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function KpiCard({ icon: Icon, label, value, hint, delta, spark, color, className }: KpiCardProps) {
  const up = (delta ?? 0) >= 0;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-card border border-hairline bg-surface p-5 shadow-panel",
        className,
      )}
      style={{ borderTopColor: color, borderTopWidth: 3 }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span
            className="inline-flex h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: `color-mix(in oklab, ${color} 16%, transparent)`, color }}
          >
            <Icon className="h-5 w-5" aria-hidden />
          </span>
          <p className="mt-3 text-sm font-semibold text-ink-muted">{label}</p>
          <p className="mt-1 text-3xl font-extrabold leading-none tracking-tight text-ink tabular-nums">
            {typeof value === "number" ? value.toLocaleString("en-GB") : value}
          </p>
          {hint && <p className="mt-1.5 text-xs text-ink-muted">{hint}</p>}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          {spark && spark.length > 1 && <Sparkline values={spark} color={color} />}
          {typeof delta === "number" && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold"
              style={{
                backgroundColor: up ? "color-mix(in oklab, var(--chart-1) 14%, transparent)" : "color-mix(in oklab, var(--chart-3) 14%, transparent)",
                color: up ? "var(--chart-1)" : "var(--chart-3)",
              }}
            >
              {up ? <ArrowUpRight className="h-3 w-3" aria-hidden /> : <ArrowDownRight className="h-3 w-3" aria-hidden />}
              {up ? "+" : ""}
              {delta.toFixed(1)}%
              <span className="sr-only">versus the previous period</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/** The grid the cards sit in, so every page uses the same rhythm. */
export function KpiGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section aria-label="Headline numbers" className={cn("grid gap-4 sm:grid-cols-2 xl:grid-cols-4", className)}>
      {children}
    </section>
  );
}
